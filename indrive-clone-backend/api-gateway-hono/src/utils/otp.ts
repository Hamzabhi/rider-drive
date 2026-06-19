import { randomInt } from "node:crypto";
import { Redis } from "ioredis";
import { config } from "../config.js";

// OTP store: phone -> code, TTL 300s. InDrive-style mobile OTP verification.
const redis = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });

const OTP_TTL_SECONDS = 300;     // 5 min
const OTP_RESEND_COOLDOWN = 60;  // 1 min

export async function generateOtp(phone: string): Promise<string> {
  // rate-limit resends
  const cooldownKey = `otp:cooldown:${phone}`;
  if (await redis.exists(cooldownKey)) {
    throw Object.assign(new Error("Please wait before requesting another code"), { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await redis.set(`otp:code:${phone}`, code, "EX", OTP_TTL_SECONDS);
  await redis.set(cooldownKey, "1", "EX", OTP_RESEND_COOLDOWN);

  // In production, dispatch via Twilio/etc. here.
  console.log(`[OTP] ${phone} -> ${code}`);
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const stored = await redis.getdel(`otp:code:${phone}`);
  return stored !== null && stored === code;
}
