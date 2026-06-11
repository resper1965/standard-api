import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@standard/schemas";

// Cloudflare Workers expose WebSocket globally. Supply it to Neon's serverless
// driver so it can open WebSocket connections to the Neon proxy for Pool mode.
// Pool mode is required for PostgreSQL transactions (and therefore SET LOCAL /
// Row-Level Security). The HTTP driver does not support transactions.
if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

/** Cloudflare Hyperdrive binding shape — only present in Workers runtime */
interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Initializes a Drizzle connection backed by @neondatabase/serverless Pool
 * (WebSocket mode). Unlike the former HTTP driver, Pool connections support
 * PostgreSQL transactions, enabling SET LOCAL for RLS policy enforcement.
 *
 * Prefers Hyperdrive when available (regional connection pooling for Neon);
 * falls back to DATABASE_URL for local dev.
 *
 * @see https://developers.cloudflare.com/hyperdrive/
 * @see infra/docker/postgres/migrations/0028_rls_setup.sql
 * @see infra/docker/postgres/migrations/0053_rls_complete.sql
 */
export const createDb = (
  databaseUrl: string,
  hyperdrive?: HyperdriveBinding,
) => {
  const connectionString = hyperdrive?.connectionString ?? databaseUrl;
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema });
};

export type DbClient = ReturnType<typeof createDb>;
