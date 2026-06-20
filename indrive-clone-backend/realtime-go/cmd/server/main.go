// indrive realtime-go: WebSocket server + gRPC RideMatching service.
//
// Responsibilities:
//  1. Accept driver WebSocket connections and ingest location updates
//     (lat/lng every ~3s) -> Redis GEOADD.
//  2. Serve the RideMatching gRPC service consumed by api-gateway-hono:
//     - CreateRideRequest: Redis GEORADIUS to find nearby drivers,
//     push the request to each via its WebSocket.
//     - SubmitDriverBid:   store the counter-offer in Redis + Postgres
//     (via HTTP callback to gateway) and broadcast it to the rider.
//     - AcceptBid:         lock the driver + notify losers to withdraw.
//     - CancelRideRequest: notify all bidders to stop.
//
// The bid exchange is the heart of the InDrive model: rider posts a price,
// drivers counter-offer in real time, rider picks one.
package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"

	"indriveclone/realtime-go/internal/bids"
	"indriveclone/realtime-go/internal/handlers"
	"indriveclone/realtime-go/internal/matching"
	redisstore "indriveclone/realtime-go/internal/redis"
	"indriveclone/realtime-go/internal/safe"
	wshub "indriveclone/realtime-go/internal/websocket"
	indrivepb "indriveclone/realtime-go/proto"
)

func main() {
	addr := getenv("LISTEN_ADDR", ":8081")
	grpcAddr := getenv("GRPC_ADDR", ":50052")
	redisURL := getenv("REDIS_URL", "redis://localhost:6379")

	// --- Redis pool ---
	rdb, err := redisstore.New(redisURL)
	if err != nil {
		log.Fatalf("redis connect: %v", err)
	}
	defer rdb.Close()

	// --- Hub: in-memory map of driverId -> *Client connection ---
	hub := wshub.NewHub(rdb)
	go hub.Run()

	// --- Bid manager: holds active bid windows + expiry timers ---
	bidMgr := bids.NewManager(rdb, hub)

	// --- Matching: GEORADIUS lookups against driver positions ---
	matchSvc := matching.NewService(rdb, hub, bidMgr)

	// --- HTTP server for the WebSocket endpoint ---
	mux := http.NewServeMux()
	mux.Handle("/ws/drivers", handlers.DriverWS(hub))
	mux.Handle("/ws/riders", handlers.RiderWS(hub))
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"realtime-go"}`))
	})

	httpSrv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// --- gRPC server (RideMatching) ---
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		log.Fatalf("grpc listen: %v", err)
	}
	// Recovery interceptor: a panic in any handler becomes an INTERNAL error
	// instead of crashing the whole process.
	grpcSrv := grpc.NewServer(grpc.UnaryInterceptor(safe.UnaryRecoveryInterceptor()))
	// gRPC handler implements indrivepb.RideMatchingServer
	indrivepb.RegisterRideMatchingServer(grpcSrv, handlers.NewMatchingGRPC(matchSvc, bidMgr, hub))

	// liftoff
	go func() {
		log.Printf("[realtime-go] http/ws listening on %s", addr)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http: %v", err)
		}
	}()
	go func() {
		log.Printf("[realtime-go] grpc listening on %s", grpcAddr)
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("grpc: %v", err)
		}
	}()

	// graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("[realtime-go] shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	httpSrv.Shutdown(ctx)
	grpcSrv.GracefulStop()
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
