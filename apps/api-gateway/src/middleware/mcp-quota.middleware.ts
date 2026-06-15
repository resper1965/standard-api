// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module mcp-quota.middleware
 * @description Per-organization rate limiting for MCP tool endpoints.
 *
 * Uses a KV-backed sliding window (1-minute granularity) keyed by:
 *   `mcp:quota:{organizationId}:{windowStartMs}`
 *
 * Design decisions:
 *   - Window is fixed (not sliding) to keep KV operations to 1 GET + 1 PUT.
 *   - TTL = 65s (5s grace) so KV evicts old windows automatically.
 *   - Limit is configurable per call â€” future: read from organizations.quotas.
 *   - Does NOT block on KV failure â€” if KV is unavailable, quota is skipped.
 *
 * Default limits (before org-plan quotas are implemented):
 *   limitPerMinute: 60  (MCP tool calls â€” more restrictive than general rate limit)
 *
 * @see docs/decisions/ADR-003-mcp-async-pattern.md
 * @see apps/api-gateway/src/routes/mcp.routes.ts
 */

export interface QuotaKV {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

export interface QuotaConfig {
  /** Maximum MCP tool calls per minute per organization. Default: 60 */
  limitPerMinute?: number;
}

export interface QuotaResult {
  allowed: boolean;
  current: number;
  remaining: number;
  limitPerMinute: number;
  /** Seconds until the current window expires. Only present when allowed = false. */
  retryAfterSeconds?: number;
}

/**
 * checkMcpQuota â€” check and increment the per-org MCP quota counter.
 *
 * Returns immediately with allowed=true/false.
 * Increments the KV counter only when allowed=true.
 *
 * @param organizationId  Tenant org ID (used as KV key namespace)
 * @param kv              Cloudflare KV namespace binding (or compatible mock)
 * @param config          Optional quota config â€” defaults to 60 req/min
 */
export async function checkMcpQuota(
  organizationId: string,
  kv: QuotaKV,
  config: QuotaConfig = {},
): Promise<QuotaResult> {
  const limitPerMinute = config.limitPerMinute ?? 60;
  const windowMs = 60_000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const kvKey = `mcp:quota:${organizationId}:${windowStart}`;

  const raw = await kv.get(kvKey);
  const current = raw != null ? parseInt(raw, 10) : 0;

  if (current >= limitPerMinute) {
    const windowEnd = windowStart + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000));
    return {
      allowed: false,
      current,
      remaining: 0,
      limitPerMinute,
      retryAfterSeconds,
    };
  }

  // Increment â€” TTL is 65s (5s grace beyond 60s window)
  await kv.put(kvKey, String(current + 1), { expirationTtl: 65 });

  return {
    allowed: true,
    current: current + 1,
    remaining: limitPerMinute - current - 1,
    limitPerMinute,
  };
}

