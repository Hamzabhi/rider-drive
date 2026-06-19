import pg from "pg";
import { config } from "../config.js";

// Shared Postgres pool. Used for users, rides, bids, settlements.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone        TEXT UNIQUE NOT NULL,
      first_name   TEXT,
      last_name    TEXT,
      password_hash TEXT,                 -- null if OTP-only accounts
      role         TEXT NOT NULL DEFAULT 'rider' CHECK (role IN ('rider','driver','admin')),
      is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS rides (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id      UUID NOT NULL REFERENCES users(id),
      driver_id     UUID REFERENCES users(id),
      pickup_lat    DOUBLE PRECISION NOT NULL,
      pickup_lng    DOUBLE PRECISION NOT NULL,
      pickup_addr   TEXT,
      dropoff_lat   DOUBLE PRECISION NOT NULL,
      dropoff_lng   DOUBLE PRECISION NOT NULL,
      dropoff_addr  TEXT,
      status        TEXT NOT NULL DEFAULT 'searching'
                    CHECK (status IN ('searching','assigned','in_progress','completed','cancelled')),
      rider_fare    DOUBLE PRECISION NOT NULL,   -- InDrive: rider proposes a price
      agreed_fare   DOUBLE PRECISION,
      currency      TEXT NOT NULL DEFAULT 'USD',
      vehicle_type  TEXT NOT NULL DEFAULT 'sedan',
      distance_m    DOUBLE PRECISION,
      duration_s    INTEGER,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bids (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ride_id      UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      driver_id    UUID NOT NULL REFERENCES users(id),
      amount       DOUBLE PRECISION NOT NULL,
      eta_seconds  INTEGER NOT NULL,
      currency     TEXT NOT NULL DEFAULT 'USD',
      status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','expired','withdrawn')),
      expires_at   TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_bids_ride     ON bids(ride_id);
  `);
}
