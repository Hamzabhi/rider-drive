import type { Context, Next } from "hono";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";

// Bearer token → ctx.var.user. Rejects 401 if missing/invalid.
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ success: false, error: "Unauthorized" }, 401);

  try {
    const payload = await verifyToken(token);
    c.set("user", payload as JwtPayload);
    await next();
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }
}

// Restrict to a specific role. Use after requireAuth.
export const requireRole = (role: JwtPayload["role"]) =>
  async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload;
    if (user.role !== role) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
