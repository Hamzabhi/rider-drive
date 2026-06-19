import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { bootstrap } from "./bootstrap.js";

// Block boot until DB schema + gRPC channels are ready.
bootstrap()
  .then(() => {
    serve({ fetch: app.fetch, port: config.port }, (info) => {
      console.log(`[api-gateway-hono] listening on http://localhost:${info.port}`);
    });
  })
  .catch((e) => {
    console.error("[api-gateway-hono] fatal boot error:", e);
    process.exit(1);
  });
