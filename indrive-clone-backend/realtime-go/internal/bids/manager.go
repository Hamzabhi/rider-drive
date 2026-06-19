// bids package owns the InDrive counter-offer lifecycle.
//
// When a rider posts a CreateRideRequest, this manager opens a bid window
// for that ride: drivers push counter-offers, each stored here + in Redis
// (with a 120s TTL) and forwarded to the rider's WebSocket. When the rider
// accepts one, the window is closed and all other drivers are notified
// to withdraw. If the window expires with no acceptance, the ride is
// automatically marked 'expired'.
package bids

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	redisstore "indriveclone/realtime-go/internal/redis"
	"indriveclone/realtime-go/internal/safe"
	"indriveclone/realtime-go/internal/websocket"
)

// BidWindow is the live state for one open ride's counter-offer exchange.
type BidWindow struct {
	RideId            string
	RiderId           string
	RiderProposedFare float64
	Currency          string
	VehicleType       string
	OpenedAt          time.Time
	ExpiresAt         time.Time

	mu       sync.Mutex
	bids     map[string]*Bid // bidId -> Bid (sorted by lowest amount at read)
	winner   *Bid
	closed   bool
	cancel   context.CancelFunc
}

// Bid is one driver's counter-offer for an open ride.
type Bid struct {
	Id          string  `json:"bid_id"`
	RideId      string  `json:"ride_id"`
	DriverId    string  `json:"driver_id"`
	Amount      float64 `json:"amount"`
	EtaSeconds  uint32  `json:"eta_seconds"`
	Currency    string  `json:"currency"`
	CreatedAt   int64   `json:"created_at"`
	ExpiresAt   int64   `json:"expires_at"`
	Status      string  `json:"status"` // pending | accepted | expired | withdrawn
}

const (
	WindowTTL = 120 * time.Second // InDrive-style counter-offer window
)

type Manager struct {
	rdb *redisstore.Store
	hub *websocket.Hub

	mu      sync.RWMutex
	windows map[string]*BidWindow // rideId -> window
}

func NewManager(rdb *redisstore.Store, hub *websocket.Hub) *Manager {
	return &Manager{rdb: rdb, hub: hub, windows: make(map[string]*BidWindow)}
}

// Open creates a new bid window for a ride and schedules auto-expiry.
func (m *Manager) Open(ctx context.Context, rideId, riderId, vehicleType, currency string, riderFare float64) *BidWindow {
	now := time.Now()
	w := &BidWindow{
		RideId:            rideId,
		RiderId:           riderId,
		RiderProposedFare: riderFare,
		VehicleType:       vehicleType,
		Currency:          currency,
		OpenedAt:          now,
		ExpiresAt:         now.Add(WindowTTL),
		bids:              make(map[string]*Bid),
	}
	wctx, cancel := context.WithCancel(context.Background())
	w.cancel = cancel

	m.mu.Lock()
	m.windows[rideId] = w
	m.mu.Unlock()

	// Schedule expiry. Goroutine-per-window is fine: thousands of windows
	// at once are trivial for the Go runtime (sub-MB per goroutine).
	safe.Go("bid-expiry:"+rideId, func() {
		select {
		case <-time.After(WindowTTL):
			m.expire(rideId)
		case <-wctx.Done():
			// accepted or cancelled already; no-op
		}
	})

	// Mirror the open window into Redis so other processes see it.
	_ = m.rdb.Set(ctx, "bid:window:"+rideId, riderId, WindowTTL).Err()
	return w
}

// Submit records a driver counter-offer and pushes it to the rider.
func (m *Manager) Submit(ctx context.Context, rideId, driverId string, amount float64, eta uint32, currency string) (*Bid, error) {
	m.mu.RLock()
	w, ok := m.windows[rideId]
	m.mu.RUnlock()
	if !ok {
		return nil, ErrWindowNotFound
	}

	if time.Now().After(w.ExpiresAt) {
		m.expire(rideId)
		return nil, ErrWindowClosed
	}

	now := time.Now()
	bid := &Bid{
		Id:         uuid.NewString(),
		RideId:     rideId,
		DriverId:   driverId,
		Amount:     amount,
		EtaSeconds: eta,
		Currency:   currency,
		CreatedAt:  now.Unix(),
		ExpiresAt:  w.ExpiresAt.Unix(),
		Status:     "pending",
	}

	w.mu.Lock()
	w.bids[bid.Id] = bid
	w.mu.Unlock()

	// persist + push to rider
	safe.Go("persistBid", func() { m.persistBid(ctx, bid) })
	safe.Go("notifyRider:bid_received", func() { m.notifyRider(w.RiderId, "bid_received", bid) })

	return bid, nil
}

// Accept locks a driver into a ride and notifies all losers to withdraw.
func (m *Manager) Accept(ctx context.Context, rideId, bidId, driverId string) (float64, error) {
	m.mu.Lock()
	w, ok := m.windows[rideId]
	m.mu.Unlock()
	if !ok {
		return 0, ErrWindowNotFound
	}

	w.mu.Lock()
	if w.closed {
		w.mu.Unlock()
		return 0, ErrWindowClosed
	}
	winner, ok := w.bids[bidId]
	if !ok {
		w.mu.Unlock()
		return 0, ErrBidNotFound
	}
	w.winner = winner
	w.closed = true
	losers := make([]*Bid, 0, len(w.bids))
	for id, b := range w.bids {
		if id == bidId {
			b.Status = "accepted"
			continue
		}
		b.Status = "expired"
		losers = append(losers, b)
	}
	w.mu.Unlock()

	// stop the expiry timer
	w.cancel()

	// notify everyone over WS
	safe.Go("notifyDriver:bid_accepted", func() {
		m.notifyDriver(driverId, "bid_accepted", map[string]any{
			"ride_id": rideId, "bid_id": bidId, "fare": winner.Amount,
		})
	})
	for _, l := range losers {
		l := l
		safe.Go("notifyDriver:bid_lost", func() {
			m.notifyDriver(l.DriverId, "bid_lost", map[string]any{
				"ride_id": rideId, "reason": "another_driver_accepted",
			})
		})
	}
	// clear the Redis marker
	_ = m.rdb.Del(ctx, "bid:window:"+rideId).Err()

	// remove the in-memory window
	m.mu.Lock()
	delete(m.windows, rideId)
	m.mu.Unlock()

	return winner.Amount, nil
}

// Cancel closes a window (rider cancelled or timed out) and notifies drivers.
func (m *Manager) Cancel(ctx context.Context, rideId string) {
	m.mu.Lock()
	w, ok := m.windows[rideId]
	m.mu.Unlock()
	if !ok {
		return
	}
	w.mu.Lock()
	if w.closed {
		w.mu.Unlock()
		return
	}
	w.closed = true
	driversToNotify := make([]string, 0, len(w.bids))
	for _, b := range w.bids {
		b.Status = "expired"
		driversToNotify = append(driversToNotify, b.DriverId)
	}
	w.mu.Unlock()
	w.cancel()

	for _, did := range driversToNotify {
		did := did
		safe.Go("notifyDriver:ride_cancelled", func() { m.notifyDriver(did, "ride_cancelled", map[string]any{"ride_id": rideId}) })
	}
	_ = m.rdb.Del(ctx, "bid:window:"+rideId).Err()

	m.mu.Lock()
	delete(m.windows, rideId)
	m.mu.Unlock()
}

// expire handles the WindowTTL firing with no acceptance.
func (m *Manager) expire(rideId string) {
	ctx := context.Background()
	m.mu.RLock()
	w, ok := m.windows[rideId]
	m.mu.RUnlock()
	if !ok {
		return
	}
	w.mu.Lock()
	if w.closed {
		w.mu.Unlock()
		return
	}
	w.closed = true
	drivers := make([]string, 0, len(w.bids))
	for _, b := range w.bids {
		b.Status = "expired"
		drivers = append(drivers, b.DriverId)
	}
	w.mu.Unlock()

	_ = m.rdb.Del(ctx, "bid:window:"+rideId).Err()
	for _, did := range drivers {
		did := did
		safe.Go("notifyDriver:bid_expired", func() { m.notifyDriver(did, "bid_expired", map[string]any{"ride_id": rideId}) })
	}
	safe.Go("notifyRider:bid_window_expired", func() { m.notifyRider(w.RiderId, "bid_window_expired", map[string]any{"ride_id": rideId}) })

	m.mu.Lock()
	delete(m.windows, rideId)
	m.mu.Unlock()
}

// ActiveBids returns the current leaderboard for a ride (lowest first).
func (m *Manager) ActiveBids(rideId string) []*Bid {
	m.mu.RLock()
	w, ok := m.windows[rideId]
	m.mu.RUnlock()
	if !ok {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	out := make([]*Bid, 0, len(w.bids))
	for _, b := range w.bids {
		out = append(out, b)
	}
	// simple insertion sort by amount then eta (small N)
	for i := 1; i < len(out); i++ {
		for j := i; j > 0; j-- {
			if out[j].Amount < out[j-1].Amount {
				out[j], out[j-1] = out[j-1], out[j]
			} else {
				break
			}
		}
	}
	return out
}

// ---- helpers ----------------------------------------------------------

func (m *Manager) persistBid(ctx context.Context, b *Bid) {
	// store a Redis snapshot for cross-process visibility + REST reads
	data, _ := json.Marshal(b)
	_ = m.rdb.HSet(ctx, "bid:"+b.RideId, b.Id, data).Err()
	_ = m.rdb.Expire(ctx, "bid:"+b.RideId, WindowTTL).Err()
}

func (m *Manager) notifyRider(riderId string, event string, payload any) {
	msg, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	m.hub.SendToRider(riderId, msg)
}

func (m *Manager) notifyDriver(driverId string, event string, payload any) {
	msg, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	m.hub.SendToDriver(driverId, msg)
}

// errors
type bidError string
func (e bidError) Error() string { return string(e) }
const (
	ErrWindowNotFound = bidError("bid window not found")
	ErrWindowClosed   = bidError("bid window closed")
	ErrBidNotFound    = bidError("bid not found")
)

// unused import guard
var _ = redis.Nil
