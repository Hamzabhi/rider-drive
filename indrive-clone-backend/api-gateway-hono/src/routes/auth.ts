import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../services/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateOtp, verifyOtp } from "../utils/otp.js";
import { signToken, signEnrollmentToken, verifyEnrollmentToken } from "../utils/jwt.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session-cookie.js";

export const authRoutes = new Hono();

// Single phone validator reused everywhere so no endpoint accepts an
// unvalidated phone (signup previously stored arbitrary strings).
const phone = z.string().regex(/^\+?[1-9]\d{6,14}$/, "invalid phone");
const phoneSchema = z.object({ phone });

// ---- POST /api/auth/otp/send ----------------------------------------
// Send (mock) OTP to a phone number. Rider/driver both start here.
authRoutes.post("/otp/send", async (c) => {
  const body = phoneSchema.parse(await c.req.json());
  await generateOtp(body.phone);
  return c.json({ success: true, message: "OTP sent" });
});

// ---- POST /api/auth/otp/verify --------------------------------------
// Verify the OTP. Returns a session JWT if the user exists, otherwise a
// short-lived "pre-enrollment" token so the frontend can complete signup
// for the phone it just proved ownership of.
authRoutes.post("/otp/verify", async (c) => {
  const body = z.object({ phone, code: z.string().length(6) }).parse(await c.req.json());
  const ok = await verifyOtp(body.phone, body.code);
  if (!ok) return c.json({ success: false, error: "Invalid or expired code" }, 400);

  const { rows } = await pool.query(
    "SELECT id, role, is_verified FROM users WHERE phone = $1",
    [body.phone],
  );
  if (rows.length === 0) {
    // Unknown phone — hand back an enrollment token gating /signup.
    const enrollmentToken = await signEnrollmentToken(body.phone);
    return c.json({ success: true, exists: false, enrollment_token: enrollmentToken });
  }
  const u = rows[0];
  if (!u.is_verified) {
    await pool.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [u.id]);
  }
  const token = await signToken({ sub: u.id, role: u.role, phone: body.phone });
  setSessionCookie(c, token);
  return c.json({ success: true, exists: true, token, user: { id: u.id, role: u.role } });
});

// ---- POST /api/auth/signup ------------------------------------------
// Requires a pre-enrollment token proving the phone passed OTP. The phone is
// taken from the token, not the body, so an account can only be created for a
// verified number.
const signupSchema = z.object({
  enrollment_token: z.string().min(1),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(["rider", "driver"]).default("rider"),
  password: z.string().min(8).optional(),
});

authRoutes.post("/signup", async (c) => {
  const body = signupSchema.parse(await c.req.json());

  let verifiedPhone: string;
  try {
    ({ phone: verifiedPhone } = await verifyEnrollmentToken(body.enrollment_token));
  } catch {
    return c.json({ success: false, error: "Invalid or expired enrollment token" }, 401);
  }

  const passwordHash = body.password ? await hashPassword(body.password) : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (phone, first_name, last_name, role, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, role`,
      [verifiedPhone, body.first_name ?? null, body.last_name ?? null, body.role, passwordHash],
    );
    const u = rows[0];
    const token = await signToken({ sub: u.id, role: u.role, phone: verifiedPhone });
    setSessionCookie(c, token);
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
  const body = z.object({ phone, password: z.string() }).parse(await c.req.json());
  const { rows } = await pool.query(
    "SELECT id, role, password_hash, is_verified FROM users WHERE phone = $1",
    [body.phone],
  );

  // Uniform response whether or not the phone exists, to prevent account
  // enumeration. Verify against the hash only when one is present.
  const u = rows[0];
  const passwordOk = u?.password_hash
    ? await verifyPassword(body.password, u.password_hash)
    : false;
  if (!u || !passwordOk) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const token = await signToken({ sub: u.id, role: u.role, phone: body.phone });
  setSessionCookie(c, token);
  return c.json({ success: true, token, user: { id: u.id, role: u.role } });
});

// ---- POST /api/auth/logout ------------------------------------------
// Clears the session cookie. Safe to call unauthenticated.
authRoutes.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ success: true });
});
