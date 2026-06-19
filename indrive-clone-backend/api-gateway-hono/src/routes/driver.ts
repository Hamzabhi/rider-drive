import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

// Driver-facing endpoints that don't belong to the real-time Go service:
// listing assigned rides and earnings. The actual location streaming and
// bid placement happen over the Go WebSocket.

export const driverRoutes = new Hono();
driverRoutes.use("*", requireAuth);

// Driver submits a counter-offer for an open ride via REST (alternative to
// the WebSocket path). Mostly used for tests — production goes through WS.
driverRoutes.post("/bids", async (c) => {
  const user = c.get("user") as any;
  const body = z.object({
    ride_id: z.string().uuid(),
    amount: z.number().positive(),
    eta_seconds: z.number().int().positive(),
    currency: z.string().length(3).default("USD"),
  }).parse(await c.req.json());

  const { matchingRpc } = await import("../grpc-clients/helpers.js");
  const ack = await matchingRpc.submitDriverBid({
    rideId:       body.ride_id,
    driverId:     user.sub,
    counterOffer: body.amount,
    etaSeconds:   body.eta_seconds,
    currency:     body.currency,
  });
  return c.json({ success: true, bid_id: ack.bidId, ttl_seconds: ack.ttlSeconds });
});

// Driver's ride history (assigned + completed).
driverRoutes.get("/rides", async (c) => {
  const user = c.get("user") as any;
  const { pool } = await import("../services/db.js");
  const { rows } = await pool.query(
    `SELECT id, status, rider_fare, agreed_fare, currency, vehicle_type, created_at
       FROM rides WHERE driver_id = $1
       ORDER BY created_at DESC LIMIT 50`,
    [user.sub],
  );
  return c.json({ success: true, rides: rows });
});

// Driver earnings (sum of agreed_fare over completed rides, per period).
driverRoutes.get("/earnings", async (c) => {
  const user = c.get("user") as any;
  const { pool } = await import("../services/db.js");
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(agreed_fare) FILTER (WHERE completed_at >= date_trunc('day',  now())), 0) AS today,
       COALESCE(SUM(agreed_fare) FILTER (WHERE completed_at >= date_trunc('week', now())), 0) AS week,
       COALESCE(SUM(agreed_fare) FILTER (WHERE completed_at >= date_trunc('month',now())), 0) AS month
     FROM (
       SELECT agreed_fare, updated_at AS completed_at
         FROM rides WHERE driver_id=$1 AND status='completed'
     ) t`,
    [user.sub],
  );
  return c.json({ success: true, earnings: rows[0] });
});
