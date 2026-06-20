# InDrive Clone (rider-drive) — Full Codebase Audit

**Date:** 2026-06-20
**Scope:** Frontend (SolidJS) · API gateway (Hono/Bun, TS) · Realtime/matching (Go) · Pricing (Rust) · Infra (docker-compose, Dockerfiles, buf)
**Method:** File-by-file review of every source file in each subsystem, cited by `file:line`.

---

## 0. Executive summary

The project undermines its own two headline claims:

1. **"Scalable microservices"** — The signature bidding feature keeps authoritative state (bid windows + WebSocket hub) in **in-process Go memory**. The Redis "existence marker" the README cites for cross-process visibility is **written but never read**. The system therefore only works on a **single Go instance**; the second you scale horizontally, bids, accepts, and ride-request pushes are silently lost.

2. **"Production-ready auth"** — OTP codes are logged in plaintext, `/signup` self-issues verified accounts with no OTP, WebSocket connections take identity from an unauthenticated `?id=` query param with origin checking disabled, ride endpoints have IDOR, and the JWT signing secret is committed to git.

Plus a billing engine that computes money in `f64` floating point and never rounds.

**Highest-priority clusters:** (A) in-memory bid state breaking scale-out, (B) the security cluster (secrets-in-git, OTP logging, IDOR, WS auth), (C) money-as-float in the pricing engine.

---

## 1. Architecture — documented vs. actual

```
                          ┌──────────────────────────┐
   Rider  (HTTP) ───────▶ │                          │ ─ gRPC ─▶ PricingEngine (Rust :50051)
                          │   api-gateway-hono :8080 │           CalculateFare / FinalizeFare
   Driver (WS)  ◀── WS ──▶│   JWT · OTP · REST       │ ─ gRPC ─▶ RideMatching  (Go :50052)
                          └──────────┬───────────────┘           CreateRide / Bid / Accept
                                     │ writes rides, users
                                     ▼
                        ┌──────────┐  ┌────────────┐  ┌──────────┐
                        │ Postgres │  │   Redis    │  │ MongoDB  │
                        │ (state)  │  │ (geo+bids) │  │ (logs)   │
                        └──────────┘  └─────▲──────┘  └──────────┘
                                            │ GEOADD / GEORADIUS
                                    ┌───────┴─────────┐
                                    │  realtime-go    │ ◀─ driver pings every 3s
                                    │  WS :8081 hub   │
                                    └─────────────────┘
```

### Booking flow (as designed)
1. Rider quote → Hono → Rust `CalculateFare`.
2. Rider proposes price → Hono inserts `rides(status='searching')` → Go `CreateRideRequest`.
3. Go `GEORADIUS` nearby drivers → opens 120s bid window → pushes `ride_request` over WS.
4. Drivers counter-offer → Go stores bid → pushes `bid_received` to rider.
5. Rider accepts → Go `AcceptBid` locks driver, notifies losers → Hono updates Postgres.
6. Ride completes → Hono → Rust `FinalizeFare`.

### The scale-out break (critical)

```
   ┌─ Go instance A ─┐        ┌─ Go instance B ─┐
   │ windows[ride1] ✓│        │ windows[ride1] ✗│   ← bid lands here → "window not found"
   │ hub: driverX ✓  │        │ hub: driverY ✓  │   ← push to driverX from B → silently dropped
   └─────────────────┘        └─────────────────┘
            ▲                          ▲
            └──── L4/L7 load balancer ─┘  (does NOT pin rideId to an owner)
```

With ≥2 Go instances:
- Bid submitted to the non-owning instance → `ErrWindowNotFound` (`internal/bids/manager.go:111`).
- `AcceptBid` on the wrong instance → `AcceptAck{Success:false}` (`internal/handlers/matching_grpc.go:70`).
- `ActiveBids` returns only the partial leaderboard local to one instance.
- Driver found by GEORADIUS but connected to another pod → `SendToDriver` returns false → ride request silently skipped (`internal/matching/service.go:66`).
- Owning instance crashes/redeploys → window lost, no expiry fires, riders never notified.

**Fix:** Make bid-window state authoritative in Redis (hash + sorted set per ride, `EXPIRE` for the window, keyspace-notifications or a Redis Stream for expiry fan-out). Route all WS delivery through Redis Pub/Sub with a `driverId/riderId → instance` presence registry. Until then, document and enforce single-instance deployment.

---

## 1b. Fix progress (updated 2026-06-20)

**Legend:** ✅ fixed · 🟡 partially fixed · ⬜ open

| Severity | Total | ✅ Fixed | 🟡 Partial | ⬜ Open |
|----------|-------|---------|-----------|--------|
| Critical | 9 | **9 (all)** | 0 | 0 |
| High | 12 | 0 | 1 (OTP brute-force part of rate-limiting) | 11 |
| Medium | 11 | 1 (account enumeration) + 6 sub-audit items (JWT alg pin, secret strength, phone validation, WS origin, Redis error listener, finalize-amount validation) | 0 | 10 |
| Low | 8 | 0 | 0 | 8 (visual/dark-mode polish done separately — see `UI-FIX-REPORT.md`) |

**All 9 Criticals are now addressed in code.** Two carry residuals/caveats noted in their rows: C5 (wire format still `double` — full integer/decimal migration is a follow-up) and C7 (browser dev must be same-origin/proxied for the cookie to flow).

**Files changed across the two fix sessions:**
- Gateway: `otp.ts`, `auth.ts`, `jwt.ts`, `config.ts`, `ride.ts`, `middleware/auth.ts`, `app.ts`, new `utils/session-cookie.ts`, `.env.example`.
- Realtime (Go): new `internal/auth/jwt.go`, new `internal/safe/safe.go`, `internal/handlers/websocket.go`, `internal/bids/manager.go`, `cmd/server/main.go`.
- Pricing (Rust): `src/pricing.rs`, `src/grpc_server.rs`.
- Infra: `docker-compose.yml`, `.gitignore`, backend `.env.example`.
- Frontend: `api/backend.ts`, `api/types.ts`, `api/realtime.ts`, `api/mock-provider.ts`, `store/index.ts`, `pages/auth/signup.tsx`, `pages/auth/verify-otp.tsx`.

**Compile status (all verified):** ✅ Rust pricing — `cargo test` **7/7** (incl. new money edge-case tests). ✅ Go realtime — `go build ./...` and `go vet ./...` clean. ✅ Frontend — `npx tsc -p tsconfig.app.json --noEmit` clean. Dev wiring: Vite now proxies `/api`→gateway and `/ws`→realtime (same-origin, so the HttpOnly cookie flows).

**Immediate follow-ups outside the code:** rotate the `JWT_SECRET` that was previously committed (it remains in git history); create real `.env` files from the new `.env.example` templates.

---

## 2. CRITICAL

| # | Issue | Location | Impact | Status |
|---|-------|----------|--------|--------|
| C1 | OTP printed to logs in plaintext | `api-gateway-hono/src/utils/otp.ts:23` | Anyone with log access takes over any account. | ✅ FIXED — log removed/dev-gated; timing-safe compare + attempt cap |
| C2 | No WS auth + origin `"*"` | `realtime-go/internal/handlers/websocket.go:24-31,84-91` | Identity from `?id=`, origin disabled → impersonate any driver, spoof GPS, read others' streams (CSWSH). | ✅ FIXED — stdlib HS256 verify, id from token sub, ALLOWED_ORIGINS allowlist |
| C3 | IDOR on ride mutations | `api-gateway-hono/src/routes/ride.ts:91-137` | No ownership check on `/:id/bids` & `/:id/accept-bid`; `driver_id` trusted from body → ride hijack. | ✅ FIXED — rider-ownership checks; driver derived from bid row |
| C4 | Multi-statement parameterized query, no transaction | `api-gateway-hono/src/routes/ride.ts:117-128` | `pg` rejects 2 commands in one prepared statement → runtime error; gRPC side-effect + ride update not atomic. | ✅ FIXED — split statements wrapped in BEGIN/COMMIT |
| C5 | Money is `f64`, never rounded | `computation-rust/src/pricing.rs:51-58,129-138` | Float billing → representation error, order-dependent sums, quote/finalize mismatch. | ✅ FIXED — all money cent-rounded, surge applied consistently so breakdown reconciles, NaN/negative inputs sanitized, coord + finalize-amount validation, edge-case tests added. **Residual:** wire format is still proto `double`; a full integer-minor-unit / multi-currency (JPY) migration across all services remains a follow-up. |
| C6 | Secrets + JWT key committed to git | `indrive-clone-backend/docker-compose.yml:32-33,47-48,95` | Anyone with repo access forges JWTs; DB creds plaintext; permanent in history → rotate. | ✅ FIXED — `${VAR}` interpolation, `.env` gitignored, secret strength enforced. **Rotate the previously-committed secret in git history.** |
| C7 | Auth token in `localStorage` | `src/api/backend.ts:20,28-35` | Readable by any JS/XSS/extension → token theft. Use `HttpOnly; Secure; SameSite` cookie. | ✅ FIXED — gateway sets HttpOnly;SameSite=Lax;Secure(prod) cookie; `requireAuth` reads cookie (header fallback for API clients); `/logout` added; credentialed CORS; Go WS reads cookie; frontend uses `credentials:'include'` and no longer persists the token. **Caveat:** browser dev must hit the API/WS same-origin (Vite proxy) — cross-origin needs `SameSite=None;Secure` over HTTPS. |
| C8 | `/signup` issues verified account + JWT, no OTP | `api-gateway-hono/src/routes/auth.ts:54-67` | `is_verified=TRUE`, caller-chosen role → anyone self-registers as `driver` for any phone. | ✅ FIXED — signup requires OTP-proof enrollment token; frontend flow reordered |
| C9 | No panic recovery in Go | `realtime-go` all goroutines; `cmd/server/main.go:81` | A panic in any goroutine kills the whole process → one bad message drops every connection. | ✅ FIXED — new `internal/safe` package: gRPC unary recovery interceptor + `safe.Go` wrapping every detached goroutine (WS writer pump, persist, notify, expiry). |

---

## 3. HIGH

### Security
- 🟡 **PARTIAL — No rate limiting / OTP brute-force protection** — OTP side is now hardened: per-code attempt cap (max 5), `crypto.timingSafeEqual` compare, code burned on exhaustion (`src/utils/otp.ts`). **Still open:** there is no IP/identifier rate limiter on `/login`, `/signup`, `/otp/send` themselves. Add a Redis-backed limiter middleware.
- ⬜ **OPEN — Plaintext, unauthenticated gRPC** — `createInsecure()` in `api-gateway-hono/src/grpc-clients/index.ts:24,30`; `grpc.NewServer()` with no creds in `realtime-go/cmd/server/main.go:81`. Note the gateway now derives the driver from the bid row so `AcceptBid` can't be told an arbitrary driver, but `matching_grpc.go:68` still doesn't verify ownership and the channels are still plaintext. Add mTLS + authz interceptor.
- ⬜ **OPEN — Datastore ports exposed to host** — Redis (no password), Postgres, Mongo, and internal gRPC `50051/50052` all published in `docker-compose.yml`. Remove `ports:`; add Redis `--requirepass`. (Secrets are now externalized — see C6 — but the ports are still open.)
- ⬜ **OPEN — Zero coordinate validation** — `computation-rust/src/pricing.rs`, `realtime-go/internal/redis/store.go:48-58`. `NaN`/`Inf` → `NaN` fares; `serde_json` errors serializing NaN → 500 DoS. `finalize_fare` trusts client `actual_distance_meters` with no bounds (`grpc_server.rs:45-64`) → rider crafts own final charge.
- ⬜ **OPEN — Mock auth reachable in production** — `src/api/backend.ts:72` `withFallback` still falls back to mock on any 5xx/network error; mock login accepts any password, grants attacker-chosen role (`src/api/mock-provider.ts:65`). Gate behind `import.meta.env.DEV`.
- ⬜ **OPEN — Surge computed from current wall-clock at finalize, in UTC** — `computation-rust/src/pricing.rs:122-127`. Non-reproducible, un-auditable, wrong rush-hour windows for non-UTC markets. Lock surge at quote time and carry it through.

### Reliability / Scalability
- ⬜ **OPEN — No graceful shutdown (gateway)** — gateway `src/index.ts` still has no SIGTERM drain / pool close. (`realtime-go/cmd/server/main.go` does have signal-based shutdown, though it doesn't drain WS connections — see Medium.) Rust `src/main.rs:92-93` `.unwrap()` on bind crashes the critical gRPC server when the debug HTTP port fails (`try_join!` couples their fate).
- ⬜ **OPEN — No `restart:` policy; missing healthchecks** on `mongo/realtime/gateway`; gateway doesn't health-gate on `realtime` → ride-matching gRPC fails on cold start. `docker-compose.yml`.
- ⬜ **OPEN — WS reconnect permanently gives up after 5 tries (~30s)** — `src/api/realtime.ts:129`. Driver offline >30s silently stops receiving rides until reload. Retry indefinitely with jittered backoff; reset on `online`/`visibilitychange`. (Note: the client now requires a JWT to connect — that change is unrelated to the reconnect cap.)
- ⬜ **OPEN — Dev Dockerfile shipped as prod** — gateway final stage `AS dev`, `tsc ... || true`, runs uncompiled TS as root, `COPY . .`. `api-gateway-hono/Dockerfile`.
- ⬜ **OPEN — DDL on every boot** — `src/bootstrap.ts` runs `CREATE TABLE IF NOT EXISTS`; races across replicas, no migration history. Move to a migration tool.
- ⬜ **OPEN — Stale driver positions never expire** — `realtime-go/internal/redis/store.go:48-58` sets no TTL on the `drivers:geo` ZSET; `Unregister` doesn't call `RemoveDriverPosition` → dead drivers keep matching.

---

## 4. MEDIUM

- ⬜ **OPEN — Proto casing bug** — `keepCase:false` (camelCase) but `src/routes/ride.ts` `finalize` reads `finalEstimate.suggested_fare` → always `undefined` → `NaN` fare. (The accept-bid path was rewritten, but `finalize` was not touched — this is still live.)
- ⬜ **OPEN — Data race on `Bid.Status`** — mutated under lock, marshaled in detached `go persistBid` without it (`realtime-go/internal/bids/manager.go:295`). Fails `go test -race`.
- ⬜ **OPEN — TOCTOU in `Submit`** — bid inserted into possibly-closed/deleted window → phantom offers on settled ride (`manager.go:108-142`). Check `w.closed` under `w.mu`.
- ⬜ **OPEN — Error handler leaks raw messages** — `src/middleware/error-handler.ts:8` returns `err.message` (Postgres/gRPC internals).
- ✅ **FIXED — Account enumeration** — `/login` now returns a uniform 401 whether or not the phone exists (`src/routes/auth.ts`). `/otp/verify` still distinguishes new vs existing, but that is required by the (now OTP-gated) enrollment flow and no longer leaks a password oracle.
- ⬜ **OPEN — gRPC "timeout" doesn't cancel the call** — `src/grpc-clients/helpers.ts:5-15` rejects the JS promise; RPC keeps running. No retries/circuit breaker. Pass a real gRPC deadline.
- ⬜ **OPEN — Polling + WebSocket both active** — `src/pages/rider/book.tsx:43` still polls bids every 2.5s unconditionally even when WS pushes them. Poll only as a fallback when `realtime.connected()` is false.
- ⬜ **OPEN — No resource limits** on any container — one leak starves the host.
- ⬜ **OPEN — Finalize ignores surge** though proto says it includes it (`grpc_server.rs:55`); breakdown fields don't sum to total (base surged in total, returned un-surged) (`pricing.rs:129-138`).
- ✅ **FIXED — Build internally inconsistent** — `build.rs` now uses `.compile()` (correct for tonic-build 0.11), emits to the default `OUT_DIR` matching the `include!` in `grpc_server.rs` (which is now wrapped in `mod indrive`), and vendors `protoc` (`protoc-bin-vendored`) so no system install is needed. Also fixed two latent compile errors in `main.rs`/`grpc_server.rs` (`run` now returns `Send + Sync` error and takes an owned `String`). **`cargo test` now builds and passes 7/7.**
- ⬜ **OPEN — `finalize` TOCTOU + no driver/status re-check on UPDATE** — `src/routes/ride.ts` finalize SELECTs with a status guard but the UPDATE filters only by `id`.

### Also fixed (were Medium/High security items in the original per-subsystem audit)
- ✅ **JWT algorithm not pinned** → now `jwtVerify(..., { algorithms: ["HS256"] })` and enrollment tokens rejected on the session path (`src/utils/jwt.ts`).
- ✅ **Weak/placeholder JWT secret accepted at boot** → `config.ts` enforces ≥32 chars and rejects known placeholder strings.
- ✅ **Inconsistent phone validation** → a single `phone` regex schema is now applied to every auth endpoint (`src/routes/auth.ts`).
- ✅ **WebSocket origin `"*"`** → replaced with an `ALLOWED_ORIGINS` allowlist (`realtime-go/internal/auth/jwt.go`).
- ✅ **Redis client had no error listener** in the OTP module → added (`src/utils/otp.ts`).

---

## 5. LOW / Code quality

- ⬜ **OPEN — Theme system over-engineered** — ~14 files, two parallel type systems (`src/theme/types.ts` + `themeTypes.ts`) with a `TS2308` duplicate-export workaround, a 3-line pass-through `theme-provider.tsx`, and a fake color-scale generator where `700/800/900` are *lighter* than `500` (`src/theme/defaultTheme.ts:5-20`). Collapse to one system. (The dark-mode UI pass in `UI-FIX-REPORT.md` polished *appearance* but explicitly left the architecture in place.)
- ⬜ **OPEN — Mock data shipped in live pages** — `src/pages/rider/tracking.tsx` still renders from `mockDrivers[0]`; fixtures + Unsplash URLs bundled into prod chunks. DEV-gate behind dynamic import.
- ⬜ **OPEN — Pervasive `any`** in gateway routes; Hono `Variables` untyped → every `c.get("user")` cast. `as Ride` casts hide fabricated/empty domain objects in `src/store/index.ts`.
- ⬜ **OPEN — Dead/misleading code (Go)** — `Hub.Run()` = `select{}`, `Client.ctx` closure never called, write-only Redis marker, `IsDriverOnline` unused on dispatch path.
- ⬜ **OPEN — Per-request dynamic `import()`** in `src/routes/driver.ts`, `health.ts`; **two unpipelined Redis round-trips per location ping** (`store.go:48-58`).
- ⬜ **OPEN — Containers run as root** in all three Dockerfiles.
- ⬜ **OPEN — No billing edge-case tests** — `computation-rust/src/pricing.rs:155-177` covers only happy-path; no NaN/negative/boundary/rounding tests.
- ⬜ **OPEN — `LegacyApiClient` dead code** + duplicate `realtime` import in `src/store/index.ts`.

---

## 6. Remediation roadmap

**Phase 0 — Block release (Critical):** ✅ C1 OTP logging · ✅ C2 WS auth+origin · ✅ C3 IDOR · ✅ C4 SQL/transaction · ✅ C5 money cent-rounding+validation · ✅ C6 secrets out of git (⚠️ **still must rotate the old secret in git history**) · ✅ C7 cookie tokens · ✅ C8 OTP-gate signup · ✅ C9 Go panic recovery. — **9 of 9 done** (C5 wire-format & C7 dev-proxy residuals noted above).

**Phase 1 — Before multi-instance (High):** ⬜ Redis-authoritative bid windows + Pub/Sub fan-out (the core scaling fix) · ⬜ endpoint rate limiting (🟡 OTP brute-force already mitigated) · ⬜ mTLS gRPC · ⬜ close datastore ports · ⬜ coordinate + finalize-amount validation · ⬜ gateway graceful shutdown · ⬜ prod non-root Dockerfiles · ⬜ restart policies + healthchecks · ⬜ indefinite WS reconnect · ⬜ DEV-gate mock provider · ⬜ lock surge at booking.

**Phase 2 — Hardening (Medium):** ⬜ idempotency on ride lifecycle (✅ accept-bid is now transactional) · ⬜ proto-casing & data-race fixes · ⬜ DB migration tool · ⬜ stale-position reaper · ⬜ circuit breakers · ⬜ resource limits · ⬜ stop redundant polling.

**Phase 3 — Quality (Low):** ⬜ collapse theme system · ⬜ purge mock data from prod · ⬜ eliminate `any`/dead code · ⬜ billing edge-case tests · ⬜ structured logging with correlation IDs. (Dark-mode/visual polish: ✅ done separately — see `UI-FIX-REPORT.md`.)

---

## 7. Done well (credit)

- gRPC clients are long-lived singletons; OTP state correctly in Redis (gateway is stateless).
- Rust pricing hot path is genuinely allocation-free and has no global mutable surge state (thread-safe).
- Go/Rust Dockerfiles are proper multi-stage slim builds (only need a non-root `USER`).
- SolidJS JSX auto-escaping → no obvious XSS in the app's own rendering; Mapbox token read from env, not hardcoded.
