// Centralized config — single source of truth for env vars.
// Fails fast on missing required values so misconfig is caught at boot.

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),

  // gRPC targets
  pricingGrpcAddr: process.env.PRICING_GRPC_ADDR ?? "localhost:50051",
  matchingGrpcAddr: process.env.MATCHING_GRPC_ADDR ?? "localhost:50052",
} as const;
