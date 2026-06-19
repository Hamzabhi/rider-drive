# InDrive Clone — Microservice Backend

A polyglot microservice backend for an InDrive-style ride-hailing platform
where the **rider proposes a price and drivers counter-offer in real time**.

| Service            | Language    | Role                                                              | Ports        |
| ------------------ | ----------- | ----------------------------------------------------------------- | ------------ |
| `api-gateway-hono` | TypeScript  | Edge API gateway: JWT auth, OTP, ride orchestration, gRPC client  | `8080` HTTP  |
| `realtime-go`      | Go          | WebSocket hub, Redis GeoHash indexing, bid matching engine        | `8081` WS, `50052` gRPC |
| `computation-rust` | Rust        | Pricing & routing engine (Haversine, dynamic surge)               | `8082` HTTP, `50051` gRPC |
| `proto/`           | Protobuf    | Shared gRPC contract (pricing + ride matching)                    | —            |

**Databases**: PostgreSQL (users, rides, bids), Redis (geo-spatial index +
bid windows + OTP cache), MongoDB (ride event logs).

---

## Architecture overview

```
                       ┌─────────────────────────┐
   Rider (HTTP)   ─────▶│                         │
                       │   api-gateway-hono      │  ── gRPC ─► PricingEngine (Rust)
   Driver (WS) ◀──WS──▶│   (JWT auth, OTP, REST)  │  ── gRPC ─► RideMatching  (Go)
                       └────────┬────────────────┘
                                │ writes rides, users
                                ▼
                          ┌──────────┐   ┌───────────┐   ┌──────────┐
                          │ Postgres │   │   Redis   │   │  MongoDB  │
                          │ (state)  │   │ (geo+bids)│   │ (logs)   │
                          └──────────┘   └─────▲─────┘   └──────────┘
                                               │ GEOADD / GEORADIUS
                                       ┌───────┴────────┐
                                       │  realtime-go   │ ← every 3s driver pings
                                       │  (Go websocket)│
                                       └────────────────┘
```

### Request flow — rider booking a ride

1. **Rider drops pins** → `POST /api/rides/quote` (Hono)
   → Hono calls Rust `PricingEngine.CalculateFare` over gRPC
   → returns `{ suggested_fare, distance_m, duration_s, ... }` for the UI to prefill
2. **Rider proposes a price** → `POST /api/rides/request` (Hono)
   → Hono inserts the `rides` row (`status='searching'`)
   → calls Go `RideMatching.CreateRideRequest` over gRPC
3. **Go matching logic**
   → `Redis GEORADIUS drivers:geo <pickup> <radius>` → nearby driver list
   → opens a `BidWindow` (120s counter-offer timer)
   → pushes `ride_request` JSON to each driver's WebSocket
4. **Drivers counter-offer** → `POST /api/drivers/bids` (Hono) **or** WS message
   → Go stores the bid in Redis + pushes `bid_received` to the rider's WS
5. **Rider accepts a counter-offer** → `POST /api/rides/:id/accept-bid` (Hono)
   → Go `RideMatching.AcceptBid` locks the driver, notifies losers (`bid_lost`),
   returns the agreed fare
6. **Ride completes** → `POST /api/rides/:id/finalize` (driver)
   → Hono calls Rust `PricingEngine.FinalizeFare` with actual distance/time
   → stores `completed` row + agreed fare

---

## Why this stack?

### Go for real-time
**Goroutines** let one process hold thousands of concurrent WebSocket
connections cheaply (~10KB stack each). The `Location-Sync Service` ingests
driver lat/lng every ~3s and `GEOADD`s straight into Redis, never blocking.
The Hub is a `sync.RWMutex`-guarded map — lock-free reads on the hot path.
Bid windows use one goroutine + `time.After` each (per-window expiry is O(1)
in CPU; thousands of windows cost single-digit MB of memory).

### Rust for heavy math
`haversine_m` is pure float math on the stack — zero allocation per call.
Rust's memory safety + LLVM's auto-vectorization make this C++-equivalent
speed without `unsafe` hazards. The surge multiplier and fare rules are
simple arithmetic the compiler can inline fully.

### Hono.js for the API gateway
Hono ships a small (~14KB) edge-ready router that runs identically on
Bun and Node. It's ~10× faster than Express on the routing layer, supports
middleware (`zod` validation, custom `requireAuth`), and gives us a
single TypeScript entry point for auth + REST + gRPC client fan-out.

---

## Local development

### Option A — full Docker stack (recommended)

```bash
cd indrive-clone-backend
docker compose up --build
# Gateway on http://localhost:8080
# Rust debug on http://localhost:8082/quote?pickup_lat=40.7580&pickup_lng=-73.9855&dropoff_lat=40.7829&dropoff_lng=-73.9654&vehicle_type=sedan
# Realtime WS on ws://localhost:8081/ws/drivers?id=<driverId>
```

### Option B — run services individually

Each service has a `.env.example` — copy to `.env` and adjust.

```bash
# 1. Infrastructure
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 5432:5432 -e POSTGRES_USER=indrive -e POSTGRES_PASSWORD=indrive -e POSTGRES_DB=indrive postgres:16-alpine

# 2. Rust pricing
cd computation-rust && cargo run --release    # serves gRPC :50051 + HTTP :8082

# 3. Go realtime
cd realtime-go && go generate ./... && go run ./cmd/server    # :8081 WS + :50052 gRPC

# 4. Hono gateway
cd api-gateway-hono && bun install && bun run src/index.ts    # :8080 HTTP
```

### Generate proto stubs (only needed if you edit `proto/indrive.proto`)

```bash
cd indrive-clone-backend
buf generate
```

---

## API quick reference

### Auth (Hono)

| Method | Path                  | Body                                  | Returns                         |
| ------ | --------------------- | ------------------------------------- | ------------------------------- |
| POST   | `/api/auth/otp/send`  | `{ phone }`                           | sends 6-digit OTP              |
| POST   | `/api/auth/otp/verify`| `{ phone, code }`                     | JWT if user exists             |
| POST   | `/api/auth/signup`    | `{ phone, role, password? }`          | JWT                             |
| POST   | `/api/auth/login`     | `{ phone, password }`                 | JWT                             |

### Ride flow (Hono, requires `Authorization: Bearer <jwt>`)

| Method | Path                          | Body                                                                | Returns                                   |
| ------ | ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| POST   | `/api/rides/quote`             | `{ pickup, dropoff, vehicle_type }`                                 | suggested fare from Rust                  |
| POST   | `/api/rides/request`           | `{ pickup, dropoff, rider_fare, vehicle_type, search_radius_meters }`| ride_id + nearby driver count             |
| GET    | `/api/rides/:id/bids`          | —                                                                   | leaderboard of pending counter-offers     |
| POST   | `/api/rides/:id/accept-bid`    | `{ bid_id, driver_id }`                                              | assigned driver + agreed fare            |
| POST   | `/api/rides/:id/finalize`      | `{ actual_distance_meters, actual_duration_seconds }`               | reconciled final fare from Rust          |

### Driver (Hono, driver JWT)

| Method | Path                | Body                                           | Returns                 |
| ------ | ------------------- | ---------------------------------------------- | ----------------------- |
| POST   | `/api/drivers/bids` | `{ ride_id, amount, eta_seconds }`              | bid_id + ttl            |
| GET    | `/api/drivers/rides` | —                                              | ride history            |
| GET    | `/api/drivers/earnings` | —                                           | today/week/month totals |

### Realtime (Go)

- **WebSocket** `ws://localhost:8081/ws/drivers?id=<driverId>`
  - Send: `{ "lat": <f64>, "lng": <f64> }` every ~3s
  - Receive: `{ event: "ride_request", data: { ride_id, pickup, rider_proposed_fare, ... } }` and bid outcomes
- **WebSocket** `ws://localhost:8081/ws/riders?id=<riderId>`
  - Receive: `{ event: "bid_received", data: { amount, eta_seconds, driver_id } }` etc.

### Pricing (Rust, debug HTTP)

```
GET /quote?pickup_lat=40.7580&pickup_lng=-73.9855&dropoff_lat=40.7829&dropoff_lng=-73.9654&vehicle_type=sedan
→ { "suggested_fare": 8.42, "distance_m": 3124.5, "duration_s": 375, "surge_multiplier": 1.5, ... }
```

---

## The gRPC proto (overview)

Full file at [`proto/indrive.proto`](proto/indrive.proto). Two services:

```protobuf
service PricingEngine {        // served by Rust
  rpc CalculateFare(FareRequest) returns (FareEstimate);
  rpc FinalizeFare(FinalizeRequest) returns (FareEstimate);
}

service RideMatching {         // served by Go
  rpc CreateRideRequest(CreateRideRequestMsg) returns (RideRequestAck);
  rpc SubmitDriverBid(DriverBid) returns (BidAck);
  rpc AcceptBid(AcceptBidMsg) returns (AcceptAck);
  rpc CancelRideRequest(CancelRideMsg) returns (Empty);
}
```

Both clients (in Hono) read this same proto via `@grpc/proto-loader` so adding
a field anywhere picks up everywhere automatically once `buf generate` is rerun.

---

## The InDrive bid system in detail

The signature mechanic of InDrive is **rider-propose-a-price** with **real-time
multi-driver counter-offers**. Implementation lives in
[`realtime-go/internal/bids`](realtime-go/internal/bids/manager.go):

1. **Open window.** `Manager.Open(rideId, riderId, currency, riderFare)` is
   called synchronously inside `CreateRideRequest`. It allocates a
   `BidWindow`, schedules a 120s expiry goroutine, and mirrors an existence
   key in Redis (`bid:window:<rideId>` → riderId, TTL 120s) for cross-process
   visibility.

2. **Submit counter-offer.** Each `SubmitDriverBid` writes a `Bid` into the
   in-memory map **and** pushes `{ event: "bid_received", data: { amount, eta_seconds, driver_id } }`
   to the rider's WebSocket via the Hub. Both paths (gRPC via Hono, direct WS
   from the driver client) funnel into the same `bids.Submit`.

3. **Leaderboard.** The rider UI receives the bids in real time; lowest amount,
   shortest ETA sorts first. `ActiveBids(rideId)` returns this on REST
   snapshot reads as a fallback for clients not on WS yet.

4. **Accept.** `Accept(rideId, bidId, driverId)`:
   - locks the window (`closed = true`)
   - cancels the expiry goroutine via `context.CancelFunc`
   - sets winner status `accepted`, all others `expired`
   - sends `bid_accepted` to the winner and `bid_lost` to each loser
   - returns the `agreed_fare` so Hono can update the Postgres `rides.agreed_fare`
     and mark `status='assigned'`

5. **Timeout.** If the 120s timer fires with no acceptance, `expire()` marks
   every pending bid `expired`, deletes the Redis marker, and notifies the
   rider with `bid_window_expired`. The Postgres ride stays in `searching`
   for the rider to retry.

### Concurrency notes

- The Hub uses `sync.RWMutex` — push reads don't block each other, only
  register/unregister takes a write lock.
- Each `BidWindow` has its own `sync.Mutex` so bid submits for different
  rides never contend on the same lock.
- All WS writes go through buffered `chan []byte` Send (size 32); a full
  channel is dropped, never blocks the goroutine pool — preventing one slow
  client from back-pressuring the match.
- The bid-window expiry goroutine is cheap (per-window cost ~8KB).

---

## Project layout

```
indrive-clone-backend/
├── api-gateway-hono/           # Hono.js + Bun — Auth, REST, gRPC clients
│   ├── src/
│   │   ├── routes/            # auth, ride, driver, health
│   │   ├── middleware/        # requireAuth, requireRole, error-handler
│   │   ├── grpc-clients/      # PricingEngine + RideMatching clients
│   │   ├── services/          # Postgres pool + schema
│   │   └── utils/             # JWT, OTP, password hashing
│   └── Dockerfile
├── realtime-go/               # Go — WebSockets + Redis Geo + bid engine
│   ├── cmd/server/            # main: HTTP + gRPC bootstrapping
│   ├── internal/
│   │   ├── websocket/         # Hub + Client
│   │   ├── redis/             # GEOADD / GEORADIUS wrappers
│   │   ├── matching/          # nearby-driver lookup + dispatch
│   │   ├── bids/              # 120s counter-offer window FSM
│   │   └── handlers/          # WS upgraders + gRPC RideMatching adapter
│   └── Dockerfile
├── computation-rust/          # Rust — Haversine, surge, fare rules
│   ├── src/
│   │   ├── pricing.rs         # the math
│   │   ├── grpc_server.rs     # tonic PricingEngine server
│   │   └── main.rs            # boot gRPC + Axum debug HTTP
│   └── Dockerfile
├── proto/indrive.proto        # shared gRPC contract
├── buf.yaml / buf.gen.yaml    # proto codegen config
└── docker-compose.yml         # the whole stack in one command
```
