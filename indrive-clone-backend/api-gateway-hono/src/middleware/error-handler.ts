import type { Context } from "hono";

// Centralized error → JSON response. Honors `err.status` if set
// (e.g. 401, 429), otherwise 500.
export function errorHandler(err: Error, c: Context) {
  const status = (err as any).status ?? 500;
  console.error("[api-gateway] error:", err.message);
  return c.json({ success: false, error: err.message }, status);
}
