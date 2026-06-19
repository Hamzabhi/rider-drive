import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Shared proto lives at indrive-clone-backend/proto; Docker copies it to api-gateway-hono/proto. */
function resolveProtoPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../../proto/indrive.proto"),
    path.resolve(__dirname, "../../proto/indrive.proto"),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`indrive.proto not found. Tried:\n${candidates.join("\n")}`);
  }
  return found;
}

const PROTO_PATH = resolveProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const indrivePkg = protoDescriptor.indrive;

// Pricing & Routing engine — served by computation-rust.
export const pricingClient = new indrivePkg.PricingEngine(
  config.pricingGrpcAddr,
  grpc.credentials.createInsecure(),
);

// Ride Matching + Driver location — served by realtime-go.
export const matchingClient = new indrivePkg.RideMatching(
  config.matchingGrpcAddr,
  grpc.credentials.createInsecure(),
);

// Eagerly wait for both channels to be ready before the gateway boots.
export async function waitForGrpc(): Promise<void> {
  await Promise.all([
    new Promise<void>((resolve, reject) =>
      pricingClient.waitForReady(Date.now() + 5_000, (err: any) => (err ? reject(err) : resolve())),
    ),
    new Promise<void>((resolve, reject) =>
      matchingClient.waitForReady(Date.now() + 5_000, (err: any) => (err ? reject(err) : resolve())),
    ),
  ]);
  console.log("[grpc] clients ready: pricing=%s matching=%s", config.pricingGrpcAddr, config.matchingGrpcAddr);
}
