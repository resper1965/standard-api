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
// WebSockets are I/O objects bound to the request context that created them â€”
// sharing a Pool (and its WebSocket) across requests throws:
//   "Cannot perform I/O on behalf of a different request."
//
// Setting poolQueryViaFetch = true makes the Pool use HTTP for queries,
// which goes through Workers' fetch() â€” a stateless API that IS safe to
// share across request contexts. This allows the Drizzle db singleton to
// be cached at module level without causing context-crossing I/O errors.
//
// Transactions still work correctly via this mode on @neondatabase/serverless.
// See: https://neon.tech/docs/serverless/serverless-driver#pool-and-client
neonConfig.poolQueryViaFetch = false;

/** Cloudflare Hyperdrive binding shape â€” only present in Workers runtime */
interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Aponta o driver da Neon para o wsproxy de infra/docker quando a connection
 * string e o Postgres local. Neon so fala WebSocket com o proxy dela, entao sem
 * isto toda query trava em dev local. Inerte fora de localhost: nenhuma URL da
 * Neon aponta para 127.0.0.1, logo staging/producao nunca entram aqui.
 */
const configureLocalProxy = (connectionString: string) => {
  const host = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return "";
    }
  })();
  if (host !== "localhost" && host !== "127.0.0.1") return;

  // O destino real vem do APPEND_PORT do servico neon-proxy no compose
  // (postgres:5432), resolvido dentro da rede do Docker; por isso nao vai
  // address= na URL. O path /v1 e o que o wsproxy expoe.
  neonConfig.wsProxy = () => "localhost:4444/v1";
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
};

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
  configureLocalProxy(connectionString);
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema });
};

export type DbClient = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle client that the caller is responsible for closing.
 *
 * `createDb` is meant for the module-level singleton built once at bootstrap.
 * Calling it inside a request handler opens a fresh Neon Pool per request and
 * never releases it — a connection leak on exactly the kind of unauthenticated
 * endpoint an attacker would hammer (audit finding M-07).
 *
 * Use this instead when a handler genuinely needs its own connection (e.g. the
 * auth database, which is a separate Neon branch), and always close it in a
 * `finally` block.
 */
export const createDisposableDb = (
  databaseUrl: string,
  hyperdrive?: HyperdriveBinding,
): { db: DbClient; close: () => Promise<void> } => {
  const connectionString = hyperdrive?.connectionString ?? databaseUrl;
  configureLocalProxy(connectionString);
  const pool = new Pool({ connectionString });
  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end().catch(() => {}),
  };
};
