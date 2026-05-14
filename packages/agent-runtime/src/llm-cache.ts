/**
 * @module llm-cache
 * @description Semantic response cache for LLM calls.
 *
 * Caches structured output responses by hashing the full input context
 * (model + messages + schema). Eliminates redundant LLM calls for
 * identical evaluations — common in re-assessments where the same
 * control + evidence pair produces identical results.
 *
 * Storage: Cloudflare KV with configurable TTL.
 * Fallback: graceful degradation if KV is unavailable.
 */
import type { LlmGenerateInput, LlmGenerateOutput } from "./llm";

export interface LlmCacheStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type LlmCacheConfig = {
  store: LlmCacheStore;
  ttlSeconds?: number;       // Default: 3600 (1 hour)
  enabled?: boolean;          // Default: true
  maxValueBytes?: number;     // Default: 25KB — skip caching very large responses
};

/**
 * Deterministic hash of LLM input for cache key generation.
 * Uses Web Crypto API (available in Workers and Node 18+).
 */
async function hashInput(input: LlmGenerateInput): Promise<string> {
  const canonical = JSON.stringify({
    m: input.model,
    msg: input.messages.map(m => ({ r: m.role, c: m.content })),
    t: input.temperature ?? 0,
    s: input.response_format?.json_schema?.name ?? "",
  });

  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical)
  );

  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export class LlmResponseCache {
  private readonly ttl: number;
  private readonly enabled: boolean;
  private readonly maxBytes: number;

  constructor(private readonly config: LlmCacheConfig) {
    this.ttl = config.ttlSeconds ?? 3600;
    this.enabled = config.enabled ?? true;
    this.maxBytes = config.maxValueBytes ?? 25_000;
  }

  /**
   * Look up a cached response for the given LLM input.
   * Returns null on miss or if cache is disabled/unavailable.
   */
  async get(input: LlmGenerateInput): Promise<LlmGenerateOutput | null> {
    if (!this.enabled) return null;

    try {
      const hash = await hashInput(input);
      const raw = await this.config.store.get(`llm:cache:${hash}`);
      if (!raw) return null;

      const cached = JSON.parse(raw) as LlmGenerateOutput;
      return cached;
    } catch {
      // Cache read failure is never fatal
      return null;
    }
  }

  /**
   * Store a response in the cache. Fire-and-forget — never blocks the caller.
   */
  async set(input: LlmGenerateInput, output: LlmGenerateOutput): Promise<void> {
    if (!this.enabled) return;

    try {
      const serialized = JSON.stringify(output);
      if (serialized.length > this.maxBytes) return; // Skip oversized responses

      const hash = await hashInput(input);
      await this.config.store.put(`llm:cache:${hash}`, serialized, {
        expirationTtl: this.ttl,
      });
    } catch {
      // Cache write failure is never fatal
    }
  }
}
