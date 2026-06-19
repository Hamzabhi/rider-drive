// Entry-time side-effects: ensure DB schema exists and gRPC clients connect.
import { ensureSchema } from "./services/db.js";
import { waitForGrpc } from "./grpc-clients/index.js";

let bootstrapped = false;
export async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  await ensureSchema();
  await waitForGrpc();
}
