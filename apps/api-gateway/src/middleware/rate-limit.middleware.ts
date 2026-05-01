import type { RequestContext } from "../http";
import { ApiError } from "../errors/api-error";

/**
 * Rate limiter configuration per route category.
 * Uses Cloudflare KV (AEGIS_CACHE) as the backing store for rate limit counters.
 *
 * If AEGIS_CACHE is not bound (local/mock mode), rate limiting is a no-op.
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
export const assertRateLimit = async (
  context: RequestContext,
  route: string,
  kvNamespace?: KVNamespace
): Promise<void> => {
  // Graceful degradation: if KV is not bound, log and continue
  if (!kvNamespace) {
    await context.deps.audit.record("security_rate_limit_skipped", {
      route,
      tenant_id: context.tenantId,
      actor_id: context.actorId,
      trace_id: context.traceId,
      reason: "kv_namespace_not_bound"
    });
    return;
  }

  const config = resolveLimit(route);
  const key = buildKey(context.tenantId, context.actorId, route, config.windowSeconds);

  try {
    const currentRaw = await kvNamespace.get(key);
    const current = currentRaw ? parseInt(currentRaw, 10) : 0;

    if (current >= config.maxRequests) {
      await context.deps.audit.record("security_rate_limit_exceeded", {
        route,
        tenant_id: context.tenantId,
        actor_id: context.actorId,
        trace_id: context.traceId,
        current_count: current,
        max_requests: config.maxRequests,
        window_seconds: config.windowSeconds
      });

      throw new ApiError(
        "RATE_LIMIT_EXCEEDED",
        `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowSeconds}s for this endpoint.`,
        429
      );
    }

    // Increment counter with TTL matching the window
    await kvNamespace.put(key, String(current + 1), {
      expirationTtl: config.windowSeconds
    });
  } catch (error) {
    // If it's our own rate limit error, rethrow
    if (error instanceof ApiError && error.code === "RATE_LIMIT_EXCEEDED") {
      throw error;
    }

    // KV failure: degrade gracefully, don't block the request
    await context.deps.audit.record("security_rate_limit_error", {
      route,
      tenant_id: context.tenantId,
      trace_id: context.traceId,
      error: error instanceof Error ? error.message : "unknown"
    });
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
