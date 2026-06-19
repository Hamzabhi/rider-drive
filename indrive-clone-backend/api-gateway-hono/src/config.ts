// Centralized config — single source of truth for env vars.
// Fails fast on missing required values so misconfig is caught at boot.

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

// JWT_SECRET must be strong enough that HS256 tokens can't be brute-forced,
// and must not be a copied placeholder. Fail fast at boot rather than ship
// a guessable signing key.
function requiredSecret(key: string): string {
  const v = required(key);
  if (v.length < 32) throw new Error(`${key} must be at least 32 characters`);
  if (/replace[- ]?me|change[- ]?me|dev-only|secret123|please-use/i.test(v)) {
    throw new Error(`${key} looks like a placeholder — set a real secret`);
  }
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  isProd,
  jwtSecret: requiredSecret("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),

  // Session cookie (HttpOnly — not readable by JS, defeats XSS token theft).
  cookieName: process.env.SESSION_COOKIE_NAME ?? "session",
  cookieSecure: isProd, // require HTTPS in prod; allow http on localhost in dev
  cookieMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7), // 7d

  // CORS allowlist for credentialed browser requests (comma-separated origins).
  // With credentials, '*' is not permitted — list explicit origins.
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // gRPC targets
  pricingGrpcAddr: process.env.PRICING_GRPC_ADDR ?? "localhost:50051",
  matchingGrpcAddr: process.env.MATCHING_GRPC_ADDR ?? "localhost:50052",
} as const;
