/**
 * @module llm-cache
 * @description Semantic response cache for LLM calls.
 *
 * Caches structured output responses by hashing the full input context
 * (model + messages + schema). Eliminates redundant LLM calls for
 * identical evaluations â€” common in re-assessments where the same
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

export interface LlmVectorStore {
  query(vector: number[], options?: { topK?: number; filter?: Record<string, unknown>; returnMetadata?: boolean }): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>>;
  insert(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>): Promise<void>;
}

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>;
}

export type LlmCacheConfig = {
  store: LlmCacheStore; // Tier 1: Exact Hash KV
  vectorStore?: LlmVectorStore; // Tier 2: Semantic Similarity
  embeddingsProvider?: EmbeddingsProvider;
  similarityThreshold?: number; // Default: 0.96
  ttlSeconds?: number;       // Default: 3600 (1 hour)
  enabled?: boolean;          // Default: true
  maxValueBytes?: number;     // Default: 25KB â€” skip caching very large responses
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
  private readonly similarityThreshold: number;

  constructor(private readonly config: LlmCacheConfig) {
    this.ttl = config.ttlSeconds ?? 3600;
    this.enabled = config.enabled ?? true;
    this.maxBytes = config.maxValueBytes ?? 25_000;
    this.similarityThreshold = config.similarityThreshold ?? 0.96;
  }

  /**
   * Look up a cached response for the given LLM input.
   * Promotes Tier 1 (Exact Match) then Tier 2 (Semantic Match).
   * Enforces tenant isolation.
   */
  async get(organizationId: string, input: LlmGenerateInput): Promise<LlmGenerateOutput | null> {
    if (!this.enabled) return null;

    try {
      const hash = await hashInput(input);
      
      // Tier 1: Exact Match (Tenant Isolated)
      const raw = await this.config.store.get(`llm:cache:${organizationId}:${hash}`);
      if (raw) return JSON.parse(raw) as LlmGenerateOutput;

      // Tier 2: Semantic Match
      const vectorStore = this.config.vectorStore;
      const embeddingsProvider = this.config.embeddingsProvider;
      if (vectorStore && embeddingsProvider) {
        // Concatenate ONLY user inputs to find prompt intention similarity
        const userContent = input.messages
          .filter(m => m.role === "user")
          .map(m => m.content)
          .join("\n");
          
        if (userContent.trim() !== "") {
          const vector = await embeddingsProvider.embed(userContent);
          const topMatches = await vectorStore.query(vector, { 
            topK: 1, 
            filter: { organization_id: organizationId } 
          });
          
          if (topMatches.length > 0 && topMatches[0] && topMatches[0].score >= this.similarityThreshold) {
            const semanticRaw = await this.config.store.get(`llm:cache:${organizationId}:${topMatches[0].id}`);
            if (semanticRaw) return JSON.parse(semanticRaw) as LlmGenerateOutput;
          }
        }
      }

      return null;
    } catch {
      // Cache read failure is never fatal
      return null;
    }
  }

  /**
   * Store a response in the cache. Fire-and-forget â€” never blocks the caller.
   * Enforces tenant isolation.
   */
  async set(organizationId: string, input: LlmGenerateInput, output: LlmGenerateOutput): Promise<void> {
    if (!this.enabled) return;

    try {
      const serialized = JSON.stringify(output);
      if (serialized.length > this.maxBytes) return; // Skip oversized responses

      const hash = await hashInput(input);
      
      // Store in KV (Tier 1 - Tenant Isolated)
      await this.config.store.put(`llm:cache:${organizationId}:${hash}`, serialized, {
        expirationTtl: this.ttl,
      });

      // Store embedding in VectorDB (Tier 2)
      const vectorStore = this.config.vectorStore;
      const embeddingsProvider = this.config.embeddingsProvider;
      
      if (vectorStore && embeddingsProvider) {
        const userContent = input.messages
          .filter(m => m.role === "user")
          .map(m => m.content)
          .join("\n");

        if (userContent.trim() !== "") {
          const vector = await embeddingsProvider.embed(userContent);
          await vectorStore.insert([{
            id: hash,
            values: vector,
            metadata: { 
              model: input.model,
              organization_id: organizationId
            }
          }]);
        }
      }
    } catch {
      // Cache write failure is never fatal
    }
  }
}

