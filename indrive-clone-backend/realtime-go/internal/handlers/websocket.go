// handlers package owns the HTTP layer: WebSocket upgraders + the gRPC
// RideMatching adapter that turns proto messages into matching.Service calls.
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	ws "github.com/coder/websocket"

	redisstore "indriveclone/realtime-go/internal/redis"
	"indriveclone/realtime-go/internal/bids"
	"indriveclone/realtime-go/internal/matching"
	wshub "indriveclone/realtime-go/internal/websocket"
)

// WS upgrade accepts ?id=<driverId>&token=<jwt>.
// We trust the JWT in production (verified by an upstream gateway) — here
// we just extract the id so the example compiles without a JWT lib.
func DriverWS(hub *wshub.Hub) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		driverId := r.URL.Query().Get("id")
		if driverId == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		c, err := ws.Accept(w, r, &ws.AcceptOptions{
			OriginPatterns: []string{"*"},
		})
		if err != nil {
			return
		}
		defer c.CloseNow()

		ctx, cancel := context.WithTimeout(r.Context(), 24*time.Hour)
		defer cancel()

		client, clientCtx, clientCancel := wshub.NewClient(driverId, "driver")
		hub.Register(client)
		defer hub.Unregister(client)

		// writer pump: flush queued Send messages to the WS
		go func() {
			defer clientCancel()
			for {
				select {
				case <-ctx.Done():
					return
				case msg, ok := <-client.Send:
					if !ok {
						return
					}
					if err := c.Write(clientCtx, ws.MessageText, msg); err != nil {
						return
					}
				}
			}
		}()

		// reader loop: drivers send {lat,lng} JSON pings every ~3s
		for {
			_, data, err := c.Read(ctx)
			if err != nil {
				return
			}
			var loc struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			}
			if err := json.Unmarshal(data, &loc); err != nil {
				continue
			}
			// ingest into Redis GEO set; this is the GEORADIUS source
			_ = hub.RDB().UpdateDriverPosition(ctx, driverId, loc.Lat, loc.Lng)
		}
	})
}

// RiderWS connects a rider so the bid manager can push counter-offers back.
func RiderWS(hub *wshub.Hub) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		riderId := r.URL.Query().Get("id")
		if riderId == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		c, err := ws.Accept(w, r, &ws.AcceptOptions{
			OriginPatterns: []string{"*"},
		})
		if err != nil {
			return
		}
		defer c.CloseNow()

		ctx, cancel := context.WithTimeout(r.Context(), 24*time.Hour)
		defer cancel()

		client, _, _ := wshub.NewClient(riderId, "rider")
		hub.Register(client)
		defer hub.Unregister(client)

		// only flush — riders listen, they don't post locations
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-client.Send:
				if !ok {
					return
				}
				if err := c.Write(ctx, ws.MessageText, msg); err != nil {
					return
				}
			}
		}
	})
}
