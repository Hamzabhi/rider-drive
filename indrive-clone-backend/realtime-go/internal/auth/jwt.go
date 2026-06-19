// Package auth provides minimal, dependency-free verification of the HS256
// JWTs minted by the Hono api-gateway. The realtime service must not trust a
// client-supplied ?id= — it derives identity from the verified token instead.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"
)

// secret mirrors the gateway's JWT_SECRET. Loaded once at startup.
var secret = []byte(os.Getenv("JWT_SECRET"))

// Claims is the subset of the token payload this service needs.
type Claims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	Exp  int64  `json:"exp"`
}

var (
	ErrMalformed = errors.New("malformed token")
	ErrSignature = errors.New("bad signature")
	ErrExpired   = errors.New("token expired")
	ErrNoSecret  = errors.New("JWT_SECRET not configured")
)

// Verify checks the HS256 signature and expiry and returns the claims.
func Verify(token string) (*Claims, error) {
	if len(secret) == 0 {
		return nil, ErrNoSecret
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrMalformed
	}

	// Recompute the HMAC over "header.payload" and compare in constant time.
	signing := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signing))
	expected := mac.Sum(nil)

	got, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, ErrMalformed
	}
	if !hmac.Equal(expected, got) {
		return nil, ErrSignature
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrMalformed
	}
	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, ErrMalformed
	}
	if claims.Sub == "" {
		return nil, ErrMalformed
	}
	if claims.Exp != 0 && time.Now().Unix() >= claims.Exp {
		return nil, ErrExpired
	}
	return &claims, nil
}

// CookieName is the session cookie name; must match the gateway's
// SESSION_COOKIE_NAME (default "session").
func CookieName() string {
	if v := strings.TrimSpace(os.Getenv("SESSION_COOKIE_NAME")); v != "" {
		return v
	}
	return "session"
}

// AllowedOrigins returns the WebSocket origin allowlist from ALLOWED_ORIGINS
// (comma-separated host[:port] patterns). Defaults to local dev origins so we
// never silently fall back to the insecure "*" wildcard.
func AllowedOrigins() []string {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if strings.TrimSpace(raw) == "" {
		return []string{"localhost:5173", "localhost:3000", "127.0.0.1:5173"}
	}
	var out []string
	for _, p := range strings.Split(raw, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
