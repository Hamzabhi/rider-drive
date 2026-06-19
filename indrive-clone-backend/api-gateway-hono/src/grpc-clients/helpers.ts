// Thin promise wrappers around the raw grpc-js callback API so routes can
// `await` them cleanly. Each call auto-times out after 3s so a hung downstream
// never stalls a request.

const DEFAULT_TIMEOUT_MS = 3_000;

function withTimeout<T>(call: (cb: (e: Error | null, r: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("gRPC timeout")), DEFAULT_TIMEOUT_MS);
    call((err, res) => {
      clearTimeout(timer);
      err ? reject(err) : resolve(res);
    });
  });
}

export const pricingRpc = {
  calculateFare: (req: any) => withTimeout((cb) => pricingClientImported().calculateFare(req, cb)),
  finalizeFare: (req: any) => withTimeout((cb) => pricingClientImported().finalizeFare(req, cb)),
};

export const matchingRpc = {
  createRideRequest: (req: any) => withTimeout((cb) => matchingClientImported().createRideRequest(req, cb)),
  submitDriverBid:   (req: any) => withTimeout((cb) => matchingClientImported().submitDriverBid(req, cb)),
  acceptBid:         (req: any) => withTimeout((cb) => matchingClientImported().acceptBid(req, cb)),
  cancelRideRequest: (req: any) => withTimeout((cb) => matchingClientImported().cancelRideRequest(req, cb)),
};

// Late require avoids circular import at module-eval time.
import { pricingClient, matchingClient } from "./index.js";
const pricingClientImported = () => pricingClient;
const matchingClientImported = () => matchingClient;
