package handlers

import (
	"context"

	indrivepb "indriveclone/realtime-go/proto"
	"indriveclone/realtime-go/internal/bids"
	"indriveclone/realtime-go/internal/matching"
	wshub "indriveclone/realtime-go/internal/websocket"
)

// MatchingGRPC adapts the matching.Service + bids.Manager to the
// auto-generated indrivepb.RideMatchingServer interface produced by buf.
type MatchingGRPC struct {
	indrivepb.UnimplementedRideMatchingServer
	match *matching.Service
	bids  *bids.Manager
	hub   *wshub.Hub
}

func NewMatchingGRPC(match *matching.Service, bidMgr *bids.Manager, hub *wshub.Hub) *MatchingGRPC {
	return &MatchingGRPC{match: match, bids: bidMgr, hub: hub}
}

func (g *MatchingGRPC) CreateRideRequest(ctx context.Context, req *indrivepb.CreateRideRequestMsg) (*indrivepb.RideRequestAck, error) {
	// InDrive flow: rider posts a price, we find nearby drivers and open a
	// counter-offer window so drivers can bid competitively against it.
	radius := float64(req.GetSearchRadiusMeters())
	if radius == 0 {
		radius = 5000
	}
	notified, count, err := g.match.CreateRideRequest(
		ctx,
		req.GetRideId(),
		req.GetRiderId(),
		req.GetPickup().GetLatitude(),
		req.GetPickup().GetLongitude(),
		req.GetRiderProposedFare(),
		req.GetCurrency(),
		req.GetVehicleType(),
		radius,
	)
	if err != nil {
		return nil, err
	}
	return &indrivepb.RideRequestAck{
		RideId:            req.GetRideId(),
		NotifiedDriverIds: notified,
		NearbyDriverCount: count,
	}, nil
}

func (g *MatchingGRPC) SubmitDriverBid(ctx context.Context, req *indrivepb.DriverBid) (*indrivepb.BidAck, error) {
	bidId, ttl, err := g.match.SubmitBid(
		ctx,
		req.GetRideId(),
		req.GetDriverId(),
		req.GetCounterOffer(),
		req.GetEtaSeconds(),
		req.GetCurrency(),
	)
	if err != nil {
		return nil, err
	}
	return &indrivepb.BidAck{BidId: bidId, TtlSeconds: ttl}, nil
}

func (g *MatchingGRPC) AcceptBid(ctx context.Context, req *indrivepb.AcceptBidMsg) (*indrivepb.AcceptAck, error) {
	fare, err := g.bids.Accept(ctx, req.GetRideId(), req.GetBidId(), req.GetDriverId())
	if err != nil {
		return &indrivepb.AcceptAck{Success: false}, nil
	}
	return &indrivepb.AcceptAck{
		Success:          true,
		AssignedDriverId: req.GetDriverId(),
		AgreedFare:       fare,
	}, nil
}

func (g *MatchingGRPC) CancelRideRequest(ctx context.Context, req *indrivepb.CancelRideMsg) (*indrivepb.Empty, error) {
	g.bids.Cancel(ctx, req.GetRideId())
	return &indrivepb.Empty{}, nil
}

// compile-time interface assertion
var _ indrivepb.RideMatchingServer = (*MatchingGRPC)(nil)
