import type { EmbeddingModelInfo, EmbeddingProvider, EmbeddingResult } from "../types";

/**
 * Cloudflare Workers AI Embedding Provider.
 *
 * Uses Cloudflare's AI binding to generate embeddings via bge-base-en-v1.5
 * or any other model available on Workers AI.
 *
 * Requires the `AI` binding from the Worker environment.
 */
export class CloudflareAiEmbeddingProvider implements EmbeddingProvider {
  private readonly model: string;
  private readonly dimensions: number;

  constructor(
    private readonly ai: {
      run: (model: string, input: Record<string, unknown>) => Promise<{ data: number[][] }>;
    },
    options?: { model?: string; dimensions?: number }
  ) {
    this.model = options?.model ?? "@cf/baai/bge-base-en-v1.5";
    this.dimensions = options?.dimensions ?? 768;
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      provider: "cloudflare_workers_ai",
      model: this.model,
      dimensions: this.dimensions,
    };
  }

  async embedText(text: string): Promise<EmbeddingResult> {
    const result = await this.ai.run(this.model, {
      text: [text],
    });

    const vector = result.data?.[0];
    if (!vector || vector.length === 0) {
      throw new Error(`Cloudflare AI returned empty embedding for model ${this.model}`);
    }

    return {
      vector,
      model: this.model,
      dimensions: vector.length,
      usage: { tokens_used: text.split(/\s+/).length },
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    // Cloudflare Workers AI supports batch embedding natively
    const result = await this.ai.run(this.model, {
      text: texts,
    });

    const vectors = result.data;
    if (!vectors || vectors.length !== texts.length) {
      throw new Error(
        `Cloudflare AI returned ${vectors?.length ?? 0} embeddings for ${texts.length} texts`
      );
    }

    return vectors.map((vector) => ({
      vector,
      model: this.model,
      dimensions: vector.length,
    }));
  }
}
