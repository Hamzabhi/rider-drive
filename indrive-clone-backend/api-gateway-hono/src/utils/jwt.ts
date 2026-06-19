import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export interface JwtPayload {
  sub: string;       // user id
  role: "rider" | "driver" | "admin";
  phone?: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ role: payload.role, phone: payload.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  // Pin the algorithm so a token forged with a different alg is rejected.
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload.purpose) throw new Error("not a session token"); // reject enrollment tokens
  return {
    sub: payload.sub!,
    role: payload.role as JwtPayload["role"],
    phone: payload.phone as string | undefined,
  };
}

// ---- Pre-enrollment token -------------------------------------------------
// Issued by /otp/verify once a phone proves OTP ownership but has no account
// yet. /signup requires it, so an account can only be created for a phone the
// caller actually verified. Short-lived and single-purpose.
const ENROLLMENT_TTL = "15m";

export async function signEnrollmentToken(phone: string): Promise<string> {
  return new SignJWT({ purpose: "signup", phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ENROLLMENT_TTL)
    .sign(secret);
}

export async function verifyEnrollmentToken(token: string): Promise<{ phone: string }> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload.purpose !== "signup" || typeof payload.phone !== "string") {
    throw new Error("invalid enrollment token");
  }
  return { phone: payload.phone };
}
