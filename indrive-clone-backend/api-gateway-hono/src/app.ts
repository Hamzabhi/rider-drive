import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { rideRoutes } from "./routes/ride.js";
import { driverRoutes } from "./routes/driver.js";
import { healthRoutes } from "./routes/health.js";

export const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.onError(errorHandler);

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/rides", rideRoutes);
app.route("/api/drivers", driverRoutes);
