import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../services/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateOtp, verifyOtp } from "../utils/otp.js";
import { signToken } from "../utils/jwt.js";

export const authRoutes = new Hono();

const phoneSchema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "invalid phone") });

// ---- POST /api/auth/otp/send ----------------------------------------
// Send (mock) OTP to a phone number. Rider/driver both start here.
authRoutes.post("/otp/send", async (c) => {
  const { phone } = phoneSchema.parse(await c.req.json());
  await generateOtp(phone);
  return c.json({ success: true, message: "OTP sent" });
});

// ---- POST /api/auth/otp/verify --------------------------------------
// Verify the OTP. Returns a JWT if the user exists, otherwise a short-lived
// "pre-enrollment" token so the frontend can complete signup.
authRoutes.post("/otp/verify", async (c) => {
  const body = z.object({ phone: z.string(), code: z.string().length(6) }).parse(await c.req.json());
  const ok = await verifyOtp(body.phone, body.code);
  if (!ok) return c.json({ success: false, error: "Invalid or expired code" }, 400);

  const { rows } = await pool.query(
    "SELECT id, role, is_verified FROM users WHERE phone = $1",
    [body.phone],
  );
  if (rows.length === 0) {
    // Unknown phone — frontend should redirect to /signup.
    return c.json({ success: true, exists: false });
  }
  const u = rows[0];
  if (!u.is_verified) {
    await pool.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [u.id]);
  }
  const token = await signToken({ sub: u.id, role: u.role, phone: body.phone });
  return c.json({ success: true, exists: true, token, user: { id: u.id, role: u.role } });
});

// ---- POST /api/auth/signup ------------------------------------------
// Phone + role + optional password.
const signupSchema = z.object({
  phone: z.string(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(["rider", "driver"]).default("rider"),
  password: z.string().min(8).optional(),
});

authRoutes.post("/signup", async (c) => {
  const body = signupSchema.parse(await c.req.json());
  const passwordHash = body.password ? await hashPassword(body.password) : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (phone, first_name, last_name, role, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, role`,
      [body.phone, body.first_name ?? null, body.last_name ?? null, body.role, passwordHash],
    );
    const u = rows[0];
    const token = await signToken({ sub: u.id, role: u.role, phone: body.phone });
    return c.json({ success: true, token, user: { id: u.id, role: u.role } });
  } catch (e: any) {
    if (e.code === "23505") {
      return c.json({ success: false, error: "Phone already registered" }, 409);
    }
    throw e;
  }
});

// ---- POST /api/auth/login -------------------------------------------
// Password login (alternative to OTP).
authRoutes.post("/login", async (c) => {
  const body = z.object({ phone: z.string(), password: z.string() }).parse(await c.req.json());
  const { rows } = await pool.query(
    "SELECT id, role, password_hash, is_verified FROM users WHERE phone = $1",
    [body.phone],
  );
  if (rows.length === 0) return c.json({ success: false, error: "Not found" }, 404);

  const u = rows[0];
  if (!u.password_hash || !(await verifyPassword(body.password, u.password_hash))) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }
  const token = await signToken({ sub: u.id, role: u.role, phone: body.phone });
  return c.json({ success: true, token, user: { id: u.id, role: u.role } });
});
