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

// Route Pool queries through Workers fetch() instead of WebSocket.
//
// By default, @neondatabase/serverless Pool opens a WebSocket per query.
// WebSockets are I/O objects bound to the request context that created them —
// sharing a Pool (and its WebSocket) across requests throws:
//   "Cannot perform I/O on behalf of a different request."
//
// Setting poolQueryViaFetch = true makes the Pool use HTTP for queries,
// which goes through Workers' fetch() — a stateless API that IS safe to
// share across request contexts. This allows the Drizzle db singleton to
// be cached at module level without causing context-crossing I/O errors.
//
// Transactions still work correctly via this mode on @neondatabase/serverless.
// See: https://neon.tech/docs/serverless/serverless-driver#pool-and-client
neonConfig.poolQueryViaFetch = true;

/** Cloudflare Hyperdrive binding shape — only present in Workers runtime */
interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Creates a Drizzle client backed by @neondatabase/serverless Pool.
 *
 * With `poolQueryViaFetch = true` (set globally above), the Pool routes all
 * queries through HTTP/fetch instead of WebSocket. This makes the returned
 * client safe to cache as a module-level singleton in Cloudflare Workers.
 *
 * Prefers Hyperdrive when available (regional connection pooling for Neon);
 * falls back to DATABASE_URL for local dev.
 *
 * @see https://developers.cloudflare.com/hyperdrive/
 * @see https://neon.tech/docs/serverless/serverless-driver#pool-and-client
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
