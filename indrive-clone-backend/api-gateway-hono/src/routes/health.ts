import { Hono } from "hono";

export const healthRoutes = new Hono();

// Lightweight liveness probe — used by docker-compose healthcheck.
healthRoutes.get("/", (c) => c.json({ status: "ok", service: "api-gateway-hono" }));

// Readiness: confirms Postgres pool responds. Failures here should keep the
// container out of the load balancer.
healthRoutes.get("/ready", async (c) => {
  const { pool } = await import("../services/db.js");
  try {
    const r = await pool.query("SELECT 1 AS ok");
    return c.json({ status: "ready", db: r.rows[0].ok === 1 });
  } catch (e) {
    return c.json({ status: "degraded", db: false, error: (e as Error).message }, 503);
  }
});
