/**
 * @module CloudflareAiRerankerProvider
 * @description Cloudflare Workers AI reranking provider using @cf/baai/bge-reranker-base.
 */
import type { RerankResult, RerankerProvider } from "../types";

const MODEL_ID = "@cf/baai/bge-reranker-base";

type AiBinding = {
  run(
    model: string,
    input: { query: string; documents: string[] }
  ): Promise<RerankResult[]>;
};

export class CloudflareAiRerankerProvider implements RerankerProvider {
  constructor(private readonly ai: AiBinding) {}

  async rerank(
    query: string,
    documents: string[]
  ): Promise<RerankResult[]> {
    if (documents.length === 0) {
      return [];
    }

    try {
      // De acordo com a documentação da Cloudflare, AI.run para reranking retorna
      // um array de objetos ordenados pela relevância, ou precisamos iterar e retornar um RerankResult[]
      const results = await this.ai.run(MODEL_ID, {
        query,
        documents,
      });
      return results;
    } catch (error) {
      console.error("[Reranker] Erro ao chamar o modelo de reranking", error);
      // Fallback: retorna os indices na ordem original em caso de falha da IA
      return documents.map((_, index) => ({ index, score: 0 }));
    }
  }
}
