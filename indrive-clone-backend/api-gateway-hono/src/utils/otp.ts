import { randomInt, timingSafeEqual } from "node:crypto";
import { Redis } from "ioredis";
import { config } from "../config.js";

// OTP store: phone -> code, TTL 300s. InDrive-style mobile OTP verification.
const redis = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
// Surface connection problems instead of crashing on an unhandled "error" event.
redis.on("error", (err) => console.error("[otp] redis error:", err.message));

const OTP_TTL_SECONDS = 300;     // 5 min
const OTP_RESEND_COOLDOWN = 60;  // 1 min
const OTP_MAX_ATTEMPTS = 5;      // verifications allowed per issued code

const codeKey = (phone: string) => `otp:code:${phone}`;
const cooldownKey = (phone: string) => `otp:cooldown:${phone}`;
const attemptsKey = (phone: string) => `otp:attempts:${phone}`;

export async function generateOtp(phone: string): Promise<string> {
  // rate-limit resends
  if (await redis.exists(cooldownKey(phone))) {
    throw Object.assign(new Error("Please wait before requesting another code"), { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await redis.set(codeKey(phone), code, "EX", OTP_TTL_SECONDS);
  await redis.set(cooldownKey(phone), "1", "EX", OTP_RESEND_COOLDOWN);
  // reset any prior failed-attempt counter for the new code
  await redis.del(attemptsKey(phone));

  // In production, dispatch via Twilio/etc. here. NEVER log the code: it would
  // let anyone with log access take over the account. Only hint in non-prod.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP] issued code for ${phone} (dev only — not logging the value in prod)`);
  }
  return code;
}

// Constant-time string compare to avoid leaking the code byte-by-byte via timing.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  // Cap verification attempts per issued code to defeat brute-forcing the
  // 1,000,000-value space. The counter is reset whenever a new code is issued.
  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  if (attempts > OTP_MAX_ATTEMPTS) {
    // Burn the code so a flood of guesses can't continue against it.
    await redis.del(codeKey(phone));
    return false;
  }

  const stored = await redis.get(codeKey(phone));
  if (stored === null) return false;

  const ok = safeEqual(stored, code);
  // Only consume the code on success; a wrong guess shouldn't reset the
  // attempt budget by deleting+reissuing implicitly.
  if (ok) {
    await redis.del(codeKey(phone));
    await redis.del(attemptsKey(phone));
  }
  return ok;
}
