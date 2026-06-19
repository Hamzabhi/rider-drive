// handlers package owns the HTTP layer: WebSocket upgraders + the gRPC
// RideMatching adapter that turns proto messages into matching.Service calls.
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	ws "github.com/coder/websocket"

	"indriveclone/realtime-go/internal/auth"
	redisstore "indriveclone/realtime-go/internal/redis"
	"indriveclone/realtime-go/internal/bids"
	"indriveclone/realtime-go/internal/matching"
	"indriveclone/realtime-go/internal/safe"
	wshub "indriveclone/realtime-go/internal/websocket"
)

// authConnect verifies the session JWT and returns the verified subject id,
// enforcing the expected role. The token is read from the HttpOnly `session`
// cookie the browser sends on the WS handshake, falling back to a ?token=
// query param (non-browser clients). Identity is NEVER taken from a
// client-supplied ?id= — that would let anyone impersonate any user.
func authConnect(w http.ResponseWriter, r *http.Request, wantRole string) (string, bool) {
	token := ""
	if ck, err := r.Cookie(auth.CookieName()); err == nil {
		token = ck.Value
	}
	if token == "" {
		token = r.URL.Query().Get("token")
	}
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return "", false
	}
	claims, err := auth.Verify(token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return "", false
	}
	if claims.Role != wantRole {
		http.Error(w, "forbidden", http.StatusForbidden)
		return "", false
	}
	return claims.Sub, true
}

// WS upgrade authenticates ?token=<jwt> and derives the driver id from its
// verified subject claim.
func DriverWS(hub *wshub.Hub) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		driverId, ok := authConnect(w, r, "driver")
		if !ok {
			return
		}
		c, err := ws.Accept(w, r, &ws.AcceptOptions{
			OriginPatterns: auth.AllowedOrigins(),
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
		safe.Go("driver-ws-writer:"+driverId, func() {
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
		})

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
		riderId, ok := authConnect(w, r, "rider")
		if !ok {
			return
		}
		c, err := ws.Accept(w, r, &ws.AcceptOptions{
			OriginPatterns: auth.AllowedOrigins(),
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
