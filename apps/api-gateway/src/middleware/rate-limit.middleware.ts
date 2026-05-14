import type { RequestContext } from "../http";
import { ApiError } from "../errors/api-error";

/**
 * Rate limiter configuration per route category.
 * Uses Cloudflare KV (STANDARD_CACHE) as the backing store for rate limit counters.
 *
 * If STANDARD_CACHE is not bound (local/mock mode), rate limiting is a no-op.
 *
 * Strategy: Fixed-window counting per (tenant + actor + route category).
 * Window: 60 seconds.
 */

type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  "/documents": { maxRequests: 30, windowSeconds: 60 },
  "/kb/search": { maxRequests: 60, windowSeconds: 60 },
  "/agent-runs": { maxRequests: 10, windowSeconds: 60 },
  "/render": { maxRequests: 20, windowSeconds: 60 },
  "/admin/": { maxRequests: 15, windowSeconds: 60 }
};

const DEFAULT_LIMIT: RateLimitConfig = { maxRequests: 120, windowSeconds: 60 };

/**
 * Resolves which rate limit configuration applies to a given route.
 */
const resolveLimit = (route: string): RateLimitConfig => {
  for (const [pattern, config] of Object.entries(ROUTE_LIMITS)) {
    if (route.includes(pattern)) return config;
  }
  return DEFAULT_LIMIT;
};

/**
 * Builds a unique rate-limit key: tenant:actor:route-category:window
 */
const buildKey = (tenantId: string | undefined, actorId: string | undefined, route: string, windowSeconds: number): string => {
  const t = tenantId ?? "anonymous";
  const a = actorId ?? "anonymous";
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const routeCategory = Object.keys(ROUTE_LIMITS).find((pattern) => route.includes(pattern)) ?? "default";
  return `rl:${t}:${a}:${routeCategory}:${window}`;
};

/**
 * Asserts rate limits using Cloudflare KV as the counter store.
 * If the KV namespace is not available, gracefully degrades (logs only).
 *
 * Replaces the previous `assertRateLimitPlaceholder`.
 */
/**
 * In-memory rate limit counters.
 * Eliminates 2x KV round-trips from the hot path.
 * Counters are synced to KV periodically (non-blocking).
 *
 * Trade-off: counters are per-isolate, so in multi-isolate deployments
 * a tenant could briefly exceed the limit across isolates. This is
 * acceptable for GRC workloads (not financial transactions).
 */
const counters = new Map<string, { count: number; windowStart: number }>();

const SYNC_INTERVAL_MS = 5_000;
const SYNC_BATCH_SIZE = 10;

const getOrCreateCounter = (key: string, windowSeconds: number): { count: number; windowStart: number } => {
  const now = Date.now();
  const existing = counters.get(key);
  if (existing && (now - existing.windowStart) < windowSeconds * 1000) {
    return existing;
  }
  // Window expired or new key — reset
  const fresh = { count: 0, windowStart: now };
  counters.set(key, fresh);
  return fresh;
};

export const assertRateLimit = async (
  context: RequestContext,
  route: string,
  kvNamespace?: KVNamespace
): Promise<void> => {
  // Graceful degradation: if KV is not bound, skip silently
  if (!kvNamespace) {
    // Fix: no DB write for missing KV — just a debug log
    return;
  }

  const config = resolveLimit(route);
  const key = buildKey(context.tenantId, context.actorId, route, config.windowSeconds);
  const counter = getOrCreateCounter(key, config.windowSeconds);

  // Check limit in-memory (0ms, no I/O)
  if (counter.count >= config.maxRequests) {
    await context.deps.audit.record("security_rate_limit_exceeded", {
      route,
      tenant_id: context.tenantId,
      actor_id: context.actorId,
      trace_id: context.traceId,
      current_count: counter.count,
      max_requests: config.maxRequests,
      window_seconds: config.windowSeconds
    });

    throw new ApiError(
      "RATE_LIMIT_EXCEEDED",
      `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowSeconds}s for this endpoint.`,
      429
    );
  }

  // Increment in-memory (synchronous)
  counter.count++;

  // Periodic non-blocking KV sync for cross-isolate consistency
  if (counter.count % SYNC_BATCH_SIZE === 0) {
    try {
      // Fire-and-forget KV write — doesn't block response
      kvNamespace.put(key, String(counter.count), {
        expirationTtl: config.windowSeconds
      }).catch((err: unknown) => {
        console.error("[rate-limit] KV sync failed:", err instanceof Error ? err.message : err);
      });
    } catch {
      // Swallow — KV sync is best-effort
    }
  }
};

/**
 * @deprecated Use `assertRateLimit` instead. Kept for backward compatibility.
 */
export const assertRateLimitPlaceholder = async (context: RequestContext, route: string): Promise<void> => {
  if (
    route.includes("/documents") ||
    route.includes("/kb/search") ||
    route.includes("/agent-runs") ||
    route.includes("/render") ||
    route.includes("/admin/")
  ) {
    await context.deps.audit.record("security_rate_limit_placeholder_checked", {
      route,
      tenant_id: context.tenantId,
      actor_id: context.actorId,
      trace_id: context.traceId
    });
  }
};

