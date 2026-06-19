import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { rideRoutes } from "./routes/ride.js";
import { driverRoutes } from "./routes/driver.js";
import { healthRoutes } from "./routes/health.js";

export const app = new Hono();

app.use(logger());
app.use(secureHeaders());
// Credentialed CORS so the browser sends/receives the HttpOnly session cookie.
// Origin must be an explicit allowlist (wildcard is invalid with credentials).
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.onError(errorHandler);

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/rides", rideRoutes);
app.route("/api/drivers", driverRoutes);
