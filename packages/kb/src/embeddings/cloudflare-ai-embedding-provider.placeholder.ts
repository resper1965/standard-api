import type { EmbeddingModelInfo, EmbeddingProvider, EmbeddingResult } from "../types";

export class CloudflareAiEmbeddingProviderPlaceholder implements EmbeddingProvider {
  getModelInfo(): EmbeddingModelInfo {
    return {
      provider: "cloudflare_workers_ai",
      model: "configured-at-runtime",
      dimensions: 0
    };
  }

  async embedText(): Promise<EmbeddingResult> {
    throw new Error("Cloudflare Workers AI embedding provider requires runtime bindings and is not configured in local MVP.");
  }

  async embedBatch(): Promise<EmbeddingResult[]> {
    throw new Error("Cloudflare Workers AI embedding provider requires runtime bindings and is not configured in local MVP.");
  }
}
