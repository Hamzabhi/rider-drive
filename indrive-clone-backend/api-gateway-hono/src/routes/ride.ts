import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { pool } from "../services/db.js";
import { pricingRpc, matchingRpc } from "../grpc-clients/helpers.js";

export const rideRoutes = new Hono();
rideRoutes.use("*", requireAuth);

// =========================================================================
// POST /api/rides/quote
// Rider drops A -> B, gets a SUGGESTED fare from the Rust pricing engine.
// The frontend uses this to pre-fill the rider's offer field (InDrive lets
// the rider counter the suggestion with their own price).
// =========================================================================
rideRoutes.post("/quote", async (c) => {
  const body = z.object({
    pickup:  z.object({ latitude: z.number(), longitude: z.number(), address: z.string().optional() }),
    dropoff: z.object({ latitude: z.number(), longitude: z.number(), address: z.string().optional() }),
    vehicle_type: z.enum(["sedan", "suv", "luxury", "motorcycle"]).default("sedan"),
    currency: z.string().length(3).default("USD"),
  }).parse(await c.req.json());

  const estimate = await pricingRpc.calculateFare({
    pickup:       body.pickup,
    dropoff:      body.dropoff,
    vehicleType:  body.vehicle_type,
    surgeEligible: true,
    currency:     body.currency,
  });
  return c.json({ success: true, estimate });
});

// =========================================================================
// POST /api/rides/request
// The InDrive core: rider POSTS their own proposed fare. We:
//   1. Persist the ride row (status='searching')
//   2. Call realtime-go gRPC RideMatching.CreateRideRequest
//      -> Go does a Redis GEORADIUS lookup, WebSocket-notifies nearby drivers
//         and opens the bid window (drivers counter-offer in real time).
// =========================================================================
rideRoutes.post("/request", async (c) => {
  const user = c.get("user") as any;
  const body = z.object({
    pickup:       z.object({ latitude: z.number(), longitude: z.number(), address: z.string().optional() }),
    dropoff:      z.object({ latitude: z.number(), longitude: z.number(), address: z.string().optional() }),
    rider_fare:   z.number().positive(),                 // rider's proposed price
    vehicle_type: z.enum(["sedan", "suv", "luxury", "motorcycle"]).default("sedan"),
    currency:     z.string().length(3).default("USD"),
    search_radius_meters: z.number().int().min(500).max(10000).default(5000),
  }).parse(await c.req.json());

  // 1. Persist ride
  const { rows } = await pool.query(
    `INSERT INTO rides
       (rider_id, pickup_lat, pickup_lng, pickup_addr, dropoff_lat, dropoff_lng, dropoff_addr,
        status, rider_fare, currency, vehicle_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'searching',$8,$9,$10)
     RETURNING id, rider_fare, currency, vehicle_type`,
    [user.sub, body.pickup.latitude, body.pickup.longitude, body.pickup.address ?? null,
     body.dropoff.latitude, body.dropoff.longitude, body.dropoff.address ?? null,
     body.rider_fare, body.currency, body.vehicle_type],
  );
  const ride = rows[0];

  // 2. Tell realtime-go to broadcast the request to nearby drivers
  const ack = await matchingRpc.createRideRequest({
    riderId:            user.sub,
    rideId:             ride.id,
    pickup:             body.pickup,
    dropoff:            body.dropoff,
    riderProposedFare:  ride.rider_fare,
    currency:           ride.currency,
    vehicleType:        ride.vehicle_type,
    searchRadiusMeters: body.search_radius_meters,
  });

  return c.json({
    success: true,
    ride: { id: ride.id, status: "searching", rider_fare: ride.rider_fare, currency: ride.currency },
    matching: ack,
  });
});

// =========================================================================
// GET /api/rides/:id/bids
// Fetch current counter-offers for a ride (driver -> rider UI polls this).
// The actual counters arrive over the Go WebSocket channel in real time;
// this REST endpoint is a fallback/snapshot.
// =========================================================================
rideRoutes.get("/:id/bids", async (c) => {
  const rideId = c.req.param("id");
  const { rows } = await pool.query(
    `SELECT b.id, b.driver_id, b.amount, b.eta_seconds, b.currency, b.status, b.expires_at
       FROM bids b WHERE b.ride_id = $1 AND b.status = 'pending'
       ORDER BY b.amount ASC, b.eta_seconds ASC`,
    [rideId],
  );
  return c.json({ success: true, bids: rows });
});

// =========================================================================
// POST /api/rides/:id/accept-bid
// Rider accepts a specific driver's counter-offer. We tell realtime-go
// RideMatching.AcceptBid (which locks the driver + broadcasts to losers),
// then update the ride row to status='assigned' with the agreed fare.
// =========================================================================
rideRoutes.post("/:id/accept-bid", async (c) => {
  const rideId = c.req.param("id");
  const body = z.object({ bid_id: z.string().uuid(), driver_id: z.string().uuid() }).parse(await c.req.json());

  const ack = await matchingRpc.acceptBid({
    rideId, bidId: body.bid_id, driverId: body.driver_id,
  });

  if (ack.success) {
    await pool.query(
      `UPDATE rides
          SET status='assigned', driver_id=$2, agreed_fare=$3, updated_at=now()
        WHERE id=$1 AND status='searching'`,
      [rideId, body.driver_id, ack.agreedFare],
    );
    await pool.query(
      `UPDATE bids SET status='accepted' WHERE id=$1;
       UPDATE bids SET status='expired'
        WHERE ride_id=$2 AND id<>$1 AND status='pending'`,
      [body.bid_id, rideId],
    );
  }

  return c.json({
    success: ack.success,
    ride_id: rideId,
    assigned_driver_id: ack.assignedDriverId,
    agreed_fare: ack.agreedFare,
  });
});

// =========================================================================
// POST /api/rides/:id/finalize  (driver-side, when ride completes)
// Recomputes the final fare via Rust based on actual distance/time and
// marks the ride completed.
// =========================================================================
rideRoutes.post("/:id/finalize", requireRole("driver"), async (c) => {
  const rideId = c.req.param("id");
  const user = c.get("user") as any;
  const body = z.object({
    actual_distance_meters: z.number(),
    actual_duration_seconds: z.number().int(),
  }).parse(await c.req.json());

  const { rows } = await pool.query(
    `SELECT pickup_lat, pickup_lng, pickup_addr, dropoff_lat, dropoff_lng, dropoff_addr,
            currency, vehicle_type, agreed_fare
       FROM rides WHERE id=$1 AND driver_id=$2 AND status='in_progress'`,
    [rideId, user.sub],
  );
  if (rows.length === 0) return c.json({ success: false, error: "Ride not found / wrong state" }, 404);
  const r = rows[0];

  const finalEstimate = await pricingRpc.finalizeFare({
    pickup:  { latitude: r.pickup_lat, longitude: r.pickup_lng, address: r.pickup_addr },
    dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng, address: r.dropoff_addr },
    actualDistanceMeters: body.actual_distance_meters,
    actualDurationSeconds: body.actual_duration_seconds,
    vehicleType: r.vehicle_type,
    currency: r.currency,
  });

  const agreed = Number(r.agreed_fare ?? finalEstimate.suggested_fare);
  await pool.query(
    `UPDATE rides
        SET status='completed', distance_m=$2, duration_s=$3, agreed_fare=$4, updated_at=now()
      WHERE id=$1`,
    [rideId, body.actual_distance_meters, body.actual_duration_seconds, agreed],
  );

  return c.json({ success: true, ride_id: rideId, final_fare: agreed, estimate: finalEstimate });
});
