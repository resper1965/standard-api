/**
 * Rate Limiter — per-tenant, sliding window counter.
 *
 * Uses an in-memory Map for Workers (stateless restarts are acceptable
 * since Workers restart frequently). For stricter enforcement, replace
 * the store with Cloudflare KV or Durable Objects.
 *
 * Default: 100 requests per 60 seconds per tenant.
 */

export type RateLimitConfig = {
  /** Max requests per window. Default: 100 */
  maxRequests: number;
  /** Window size in seconds. Default: 60 */
  windowSizeSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  resetAt: number;
  /** Total limit per window */
  limit: number;
};

type WindowEntry = {
  count: number;
  windowStart: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSizeSeconds: 60,
};

export class RateLimiter {
  private readonly store = new Map<string, WindowEntry>();
  private readonly config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check and consume a request for the given key (typically organizationId).
   * Returns whether the request is allowed and rate limit metadata.
   */
  check(key: string): RateLimitResult {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.config.windowSizeSeconds);
    const resetAt = windowStart + this.config.windowSizeSeconds;

    let entry = this.store.get(key);

    // New window or expired window — reset
    if (!entry || entry.windowStart !== windowStart) {
      entry = { count: 0, windowStart };
    }

    entry.count++;
    this.store.set(key, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetAt,
      limit: this.config.maxRequests,
    };
  }

  /**
   * Get rate limit headers for HTTP response.
   */
  static headers(result: RateLimitResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.resetAt),
      ...(result.allowed ? {} : { "Retry-After": String(result.resetAt - Math.floor(Date.now() / 1000)) }),
    };
  }

  /**
   * Periodic cleanup of expired entries (call from a scheduled handler).
   */
  cleanup(): number {
    const now = Math.floor(Date.now() / 1000);
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart > this.config.windowSizeSeconds * 2) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

/**
 * Per-tier rate limits for different subscription levels.
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  free:       { maxRequests: 30,   windowSizeSeconds: 60 },
  starter:    { maxRequests: 100,  windowSizeSeconds: 60 },
  business:   { maxRequests: 500,  windowSizeSeconds: 60 },
  enterprise: { maxRequests: 2000, windowSizeSeconds: 60 },
};
