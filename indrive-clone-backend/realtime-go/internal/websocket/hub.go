// websocket package maintains the live driver/rider connection registry.
//
// The Hub is the in-memory switchboard. Each driver that opens a WS
// connection registers here with its driverId; riders register with their
// riderId. When a CreateRideRequest arrives, the matching layer looks up
// nearby drivers in Redis, then walks the Hub to find any that are online
// and pushes the request JSON to their WebSocket.
package websocket

import (
	"context"
	"sync"

	redisstore "indriveclone/realtime-go/internal/redis"
)

// Client is one open WebSocket connection, either a driver or a rider.
type Client struct {
	ID     string // driverId or riderId
	Role   string // "driver" | "rider"
	Send   chan []byte
	ctx    func() bool // closed ?
}

type Hub struct {
	mu      sync.RWMutex
	drivers map[string]*Client // driverId -> Client
	riders  map[string]*Client // riderId  -> Client
	rdb     *redisstore.Store
}

func NewHub(rdb *redisstore.Store) *Hub {
	return &Hub{
		drivers: make(map[string]*Client),
		riders:  make(map[string]*Client),
		rdb:     rdb,
	}
}

// Run is a no-op loop reserved for future fan-out; the Hub is push-driven.
func (h *Hub) Run() {
	select {}
}

// Register adds a connection to the registry.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	switch c.Role {
	case "driver":
		h.drivers[c.ID] = c
	case "rider":
		h.riders[c.ID] = c
	}
}

// Unregister removes a connection AND marks the driver offline in Redis.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	switch c.Role {
	case "driver":
		delete(h.drivers, c.ID)
		// mark offline so matching won't dispatch to a dead socket
		_ = h.rdb.SetDriverStatusOnline(context.Background(), c.ID, 0).Err()
	case "rider":
		delete(h.riders, c.ID)
	}
}

// SendToDriver pushes a message to a specific driver's WS. Returns false
// if the driver is not currently connected (message should be skipped —
// the bid was already expired or the driver disconnected).
func (h *Hub) SendToDriver(driverId string, msg []byte) bool {
	h.mu.RLock()
	c, ok := h.drivers[driverId]
	h.mu.RUnlock()
	if !ok {
		return false
	}
	select {
	case c.Send <- msg:
		return true
	default:
		// backpressure: drop, caller should retry or skip
		return false
	}
}

// SendToRider pushes a counter-offer back to the requesting rider.
func (h *Hub) SendToRider(riderId string, msg []byte) bool {
	h.mu.RLock()
	c, ok := h.riders[riderId]
	h.mu.RUnlock()
	if !ok {
		return false
	}
	select {
	case c.Send <- msg:
		return true
	default:
		return false
	}
}

// OnlineDrivers returns the full set of currently-connected driver ids.
// Mainly for diagnostics / readiness probes.
func (h *Hub) OnlineDrivers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make([]string, 0, len(h.drivers))
	for id := range h.drivers {
		out = append(out, id)
	}
	return out
}

// RDB exposes the underlying Redis store so WS handlers can persist driver
// positions without threading the store through every call.
func (h *Hub) RDB() *redisstore.Store { return h.rdb }
