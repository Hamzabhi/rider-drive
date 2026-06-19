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
  const { payload } = await jwtVerify(token, secret);
  return {
    sub: payload.sub!,
    role: payload.role as JwtPayload["role"],
    phone: payload.phone as string | undefined,
  };
}
