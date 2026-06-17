/**
 * @module CloudflareAiEmbeddingProvider
 * @description Real Cloudflare Workers AI embedding provider using @cf/baai/bge-base-en-v1.5.
 * Dimensions: 768. Suitable for Vectorize indexes configured for 768 dims.
 */
import type { EmbeddingModelInfo, EmbeddingProvider, EmbeddingResult } from "../types";

const MODEL_ID = "@cf/baai/bge-base-en-v1.5";
const DIMENSIONS = 768;
const MAX_BATCH_SIZE = 100;

type AiBinding = {
  run(model: string, input: { text: string | string[] }): Promise<{
    data: number[][];
    shape?: number[];
  }>;
};

export class CloudflareAiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly ai: AiBinding) {}

  getModelInfo(): EmbeddingModelInfo {
    return {
      provider: "cloudflare_workers_ai",
      model: MODEL_ID,
      dimensions: DIMENSIONS
    };
  }

  async embedText(text: string): Promise<EmbeddingResult> {
    const result = await this.ai.run(MODEL_ID, { text: [text] });
    const vector = result.data?.[0];
    if (!vector || vector.length === 0) {
      throw new Error("Workers AI returned empty embedding vector");
    }
    return { vector, model: MODEL_ID, dimensions: vector.length };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const response = await this.ai.run(MODEL_ID, { text: batch });
      if (!response.data || response.data.length !== batch.length) {
        throw new Error(`Workers AI batch mismatch: expected ${batch.length}, got ${response.data?.length ?? 0}`);
      }
      for (const vector of response.data) {
        results.push({ vector, model: MODEL_ID, dimensions: vector.length });
      }
    }
    return results;
  }
}

