import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const url = process.env.DATABASE_URL;

// Only inject an ssl option when the URL doesn't already include sslmode.
// When sslmode is present in the URL (e.g. Neon's sslmode=require&channel_binding=require)
// pg resolves SSL and channel-binding from the URL itself — adding a separate ssl
// object would override and break it.
const hasExplicitSslMode = url.includes("sslmode=");
const poolConfig: pg.PoolConfig = { connectionString: url };
if (!hasExplicitSslMode && process.env.NODE_ENV === "production") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("pg pool error:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
