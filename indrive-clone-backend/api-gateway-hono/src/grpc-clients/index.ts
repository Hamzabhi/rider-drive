import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, "../../proto/indrive.proto");

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
      pricingClient.waitForReady(Date.now() + 5_000, (err) => (err ? reject(err) : resolve())),
    ),
    new Promise<void>((resolve, reject) =>
      matchingClient.waitForReady(Date.now() + 5_000, (err) => (err ? reject(err) : resolve())),
    ),
  ]);
  console.log("[grpc] clients ready: pricing=%s matching=%s", config.pricingGrpcAddr, config.matchingGrpcAddr);
}
