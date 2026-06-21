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
  "/admin/": { maxRequests: 15, windowSeconds: 60 },
  "/intelligence/council": { maxRequests: 5, windowSeconds: 60 },
  "/intelligence/": { maxRequests: 20, windowSeconds: 60 },
  // Auth endpoints â€” prevent mass signups flooding USER_LIFECYCLE_QUEUE
  "/auth/sign-up": { maxRequests: 10, windowSeconds: 60 },
  "/auth/sign-in": { maxRequests: 20, windowSeconds: 60 },
  "/auth/forgot-password": { maxRequests: 5, windowSeconds: 60 },
  // Recovery endpoint — unauthenticated, strict limit to prevent brute-force
  "/admin/recovery": { maxRequests: 3, windowSeconds: 60 },
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
const buildKey = (
  organizationId: string | undefined,
  actorId: string | undefined,
  ip: string,
  route: string,
  windowSeconds: number,
): string => {
  const t = organizationId ?? "anonymous";
  const a = actorId ?? ip; // Fallback to IP if anonymous
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const routeCategory =
    Object.keys(ROUTE_LIMITS).find((pattern) => route.includes(pattern)) ??
    "default";
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
 * Counters are synced to KV every SYNC_BATCH_SIZE increments (non-blocking).
 *
 * Trade-off: counters are per-isolate, so in multi-isolate deployments
 * a tenant could briefly exceed the limit across isolates. This is
 * acceptable for GRC workloads (not financial transactions).
 */
const counters = new Map<string, { count: number; windowStart: number }>();

/** Sync KV every N in-memory increments (batch-based, not time-based). */
const SYNC_BATCH_SIZE = 10;

/** Hard cap on in-memory counter entries to prevent unbounded growth. */
const MAX_COUNTERS = 10_000;

const getOrCreateCounter = (
  key: string,
  windowSeconds: number,
): { count: number; windowStart: number } => {
  const now = Date.now();
  const existing = counters.get(key);
  if (existing && now - existing.windowStart < windowSeconds * 1000) {
    return existing;
  }
  // Window expired or new key â€” reset
  const fresh = { count: 0, windowStart: now };
  counters.set(key, fresh);
  return fresh;
};

/**
 * Prunes expired entries from the in-memory counters map and enforces
 * the MAX_COUNTERS cap by evicting the oldest entries when exceeded.
 * Uses a default 60s window for expiry since the actual per-route config
 * isn't available here â€” safe because it only affects cleanup, not limiting.
 */
const pruneExpiredCounters = (): void => {
  const now = Date.now();
  const defaultWindowMs = 60 * 1000;

  // Pass 1: remove expired entries
  for (const [key, entry] of counters) {
    if (now - entry.windowStart >= defaultWindowMs) {
      counters.delete(key);
    }
  }

  // Pass 2: if still over cap, evict oldest entries
  if (counters.size > MAX_COUNTERS) {
    const sorted = [...counters.entries()].sort(
      (a, b) => a[1].windowStart - b[1].windowStart,
    );
    const excess = sorted.length - MAX_COUNTERS;
    for (let i = 0; i < excess; i++) {
      const entry = sorted[i];
      if (entry) counters.delete(entry[0]);
    }
  }
};

export const assertRateLimit = async (
  context: RequestContext,
  route: string,
  kvNamespace?: KVNamespace,
): Promise<void> => {
  const ip =
    context.request.headers.get("cf-connecting-ip") ??
    context.request.headers.get("x-forwarded-for") ??
    "unknown_ip";
  const config = resolveLimit(route);

  // Graceful degradation: if KV is not bound, set mock headers and skip silently
  if (!kvNamespace) {
    context.rateLimitHeaders = {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(config.maxRequests),
      "X-RateLimit-Reset": "0",
    };
    return;
  }

  const key = buildKey(
    context.organizationId,
    context.actorId,
    ip,
    route,
    config.windowSeconds,
  );
  const counter = getOrCreateCounter(key, config.windowSeconds);

  // Periodic pruning â€” only when map is getting large, to avoid overhead
  if (counters.size > MAX_COUNTERS / 2) {
    pruneExpiredCounters();
  }

  const limit = config.maxRequests;
  const remaining = Math.max(0, limit - (counter.count + 1));
  const reset = Math.max(
    0,
    Math.ceil(
      (counter.windowStart + config.windowSeconds * 1000 - Date.now()) / 1000,
    ),
  );

  context.rateLimitHeaders = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };

  // Check limit in-memory (0ms, no I/O)
  if (counter.count >= config.maxRequests) {
    context.rateLimitHeaders["Retry-After"] = String(reset);

    // H5 fix: audit is fire-and-forget â€” DB failure must not block the 429 response
    context.deps.audit
      .record("security_rate_limit_exceeded", {
        route,
        organization_id: context.organizationId,
        actor_id: context.actorId,
        trace_id: context.traceId,
        current_count: counter.count,
        max_requests: config.maxRequests,
        window_seconds: config.windowSeconds,
        ip_address: ip,
      })
      .catch((e: unknown) =>
        console.error(
          "[rate-limit] audit record failed:",
          e instanceof Error ? e.message : e,
        ),
      );

    if (context.deps.SOC_TRIAGE_QUEUE) {
      const sendOp = context.deps.SOC_TRIAGE_QUEUE.send({
        job_id: crypto.randomUUID(),
        organizationId: context.organizationId ?? "system",
        traceId: context.traceId,
        systemModuleName: "API Gateway - WAF/Rate Limiter",
        rawLogsExcerpt: `[Rate Limiting Block] Endpoint: ${route} breached quota. \nActor: ${context.actorId ?? "anon"}\nIP: ${ip}\nCount: ${counter.count}/${config.maxRequests} per ${config.windowSeconds}s.\nAction: HTTP 429 triggered. Possible Unrestricted Resource Consumption attack.`,
      }).catch(async (err) => {
        // Dead-Letter Queue (DLQ) Fallback
        console.error(
          "[standard:rate-limit] SOC Queue down. Saving to DLQ KV:",
          err,
        );
        if (kvNamespace) {
          await kvNamespace.put(
            `dlq:soc:rate-limit:${context.traceId}`,
            JSON.stringify({ ip, route, count: counter.count }),
            { expirationTtl: 86400 },
          );
        }
      });
      // Fire and guarantee execution via Cloudflare Edge WaitUntil
      if (context.execCtx?.waitUntil) {
        context.execCtx.waitUntil(sendOp);
      }
    }

    throw new ApiError(
      "RATE_LIMIT_EXCEEDED",
      `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowSeconds}s for this endpoint.`,
      429,
    );
  }

  // Increment in-memory (synchronous)
  counter.count++;

  // Periodic non-blocking KV sync for cross-isolate consistency
  if (counter.count % SYNC_BATCH_SIZE === 0) {
    try {
      // Fire-and-forget KV write â€” doesn't block response
      kvNamespace
        .put(key, String(counter.count), {
          expirationTtl: config.windowSeconds,
        })
        .catch((err: unknown) => {
          console.error(
            "[rate-limit] KV sync failed:",
            err instanceof Error ? err.message : err,
          );
        });
    } catch {
      // Swallow â€” KV sync is best-effort
    }
  }
};

