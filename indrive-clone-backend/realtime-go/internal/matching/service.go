// matching package is the core "find drivers for this ride" engine.
//
// It bridges Redis geo-spatial lookups (GEORADIUS) with the in-memory Hub
// (live WebSocket connections). When CreateRideRequest arrives via gRPC:
//
//   1. GEORADIUS drivers:geo pickup lat/lng radiusM -> list of nearby drivers
//   2. For each driver: still online in hub? push the ride request JSON
//   3. Open a bid window via bids.Manager so their counter-offers land
//      somewhere the rider can see them.
package matching

import (
	"context"
	"encoding/json"

	redisstore "indriveclone/realtime-go/internal/redis"
	"indriveclone/realtime-go/internal/websocket"
	"indriveclone/realtime-go/internal/bids"
)

type Service struct {
	rdb     *redisstore.Store
	hub     *websocket.Hub
	bids    *bids.Manager
}

func NewService(rdb *redisstore.Store, hub *websocket.Hub, bidMgr *bids.Manager) *Service {
	return &Service{rdb: rdb, hub: hub, bids: bidMgr}
}

// CreateRideRequest is the gRPC handler entry point from api-gateway-hono.
// Returns the list of driver ids that received the WS push.
func (s *Service) CreateRideRequest(
	ctx context.Context,
	rideId, riderId string,
	pickupLat, pickupLng float64,
	riderFare float64,
	currency, vehicleType string,
	searchRadiusM float64,
) (notifiedDrivers []string, nearbyCount uint32, err error) {
	// 1. GEORADIUS — drivers within searchRadiusM of pickup.
	nearby, err := s.rdb.FindNearbyDrivers(ctx, pickupLat, pickupLng, searchRadiusM)
	if err != nil {
		return nil, 0, err
	}
	nearbyCount = uint32(len(nearby))

	// 2. Open the bid window immediately (drivers will counter-offer into it).
	s.bids.Open(ctx, rideId, riderId, vehicleType, currency, riderFare)

	// 3. Push the ride request to each nearby driver currently on a WS.
	reqMsg, _ := json.Marshal(map[string]any{
		"event": "ride_request",
		"data": map[string]any{
			"ride_id":           rideId,
			"rider_id":          riderId,
			"pickup_lat":        pickupLat,
			"pickup_lng":        pickupLng,
			"rider_proposed_fare": riderFare,
			"currency":          currency,
			"vehicle_type":      vehicleType,
			"expires_in":        120,
		},
	})

	for _, d := range nearby {
		// filter out any that aren't reachable on a live socket right now
		if s.hub.SendToDriver(d.DriverId, reqMsg) {
			notifiedDrivers = append(notifiedDrivers, d.DriverId)
		}
	}
	return notifiedDrivers, nearbyCount, nil
}

// SubmitBid proxies a driver counter-offer into the bids manager (gRPC path,
// alternative to driver posting directly on the WS).
func (s *Service) SubmitBid(ctx context.Context, rideId, driverId string, amount float64, eta uint32, currency string) (string, uint32, error) {
	bid, err := s.bids.Submit(ctx, rideId, driverId, amount, eta, currency)
	if err != nil {
		return "", 0, err
	}
	return bid.Id, uint32(bids.WindowTTL.Seconds()), nil
}
