import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";
import { config } from "../config.js";

// Session token → ctx.var.user. Prefers the HttpOnly cookie (browser);
// falls back to the Authorization: Bearer header (API clients / tests).
// Rejects 401 if missing/invalid.
export async function requireAuth(c: Context, next: Next) {
  const cookieToken = getCookie(c, config.cookieName);
  const header = c.req.header("Authorization") ?? "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = cookieToken ?? headerToken;
  if (!token) return c.json({ success: false, error: "Unauthorized" }, 401);

  try {
    const payload = await verifyToken(token);
    c.set("user", payload as JwtPayload);
    await next();
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }
}

// Restrict to a specific role. Use after requireAuth. Guards against being
// mounted without requireAuth (user would be undefined).
export const requireRole = (role: JwtPayload["role"]) =>
  async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);
    if (user.role !== role) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
