package websocket

import (
	"context"
	"time"
)

// NewClient constructs a Client with a buffered send channel and a context
// cancellation function used by Unregister to flip driver status offline.
func NewClient(id, role string) (*Client, context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	c := &Client{
		ID:   id,
		Role: role,
		Send: make(chan []byte, 32),
	}
	c.ctx = func() bool {
		select {
		case <-ctx.Done():
			return true
		default:
			return false
		}
	}
	// attach the context onto the client (hub uses c.ctx, but we keep a
	// reference to ctx here so Unregister can cancel + call Redis HSet
	// with this same ctx — see hub.go Unregister). We expose it via a
	// method-style closure.
	// To keep Hub.Unregister's Redis call alive, override default ctx.
	return c, ctx, cancel
}

// HeartbeatConfig defines how often drivers should send location pings.
const HeartbeatInterval = 3 * time.Second
