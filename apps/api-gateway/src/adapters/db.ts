import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

/** Cloudflare Hyperdrive binding shape — only present in Workers runtime */
interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Initializes the Drizzle connection for Cloudflare Edge.
 * Prefers Hyperdrive when available (regional connection pooling for Neon);
 * falls back to DATABASE_URL for local dev where HYPERDRIVE binding is absent.
 *
 * @see https://developers.cloudflare.com/hyperdrive/
 */
export const createDb = (
  databaseUrl: string,
  hyperdrive?: HyperdriveBinding,
) => {
  const connectionString = hyperdrive?.connectionString ?? databaseUrl;
  const sql = neon(connectionString);
  return drizzle({ client: sql, schema });
};

export type DbClient = ReturnType<typeof createDb>;
