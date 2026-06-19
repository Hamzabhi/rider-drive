// Package safe provides panic-isolation helpers. In Go a panic in ANY
// goroutine crashes the whole process, so every detached goroutine and every
// gRPC handler must recover. Without this, one malformed input takes down all
// connections on the instance.
package safe

import (
	"context"
	"log"
	"runtime/debug"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Go runs fn in a new goroutine, recovering (and logging) any panic so it
// cannot crash the process. Use this instead of a bare `go fn()`.
func Go(name string, fn func()) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[panic recovered] goroutine %q: %v\n%s", name, r, debug.Stack())
			}
		}()
		fn()
	}()
}

// UnaryRecoveryInterceptor turns a panic in any gRPC handler into a clean
// INTERNAL error instead of a process crash.
func UnaryRecoveryInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[panic recovered] gRPC %s: %v\n%s", info.FullMethod, r, debug.Stack())
				err = status.Errorf(codes.Internal, "internal error")
			}
		}()
		return handler(ctx, req)
	}
}
