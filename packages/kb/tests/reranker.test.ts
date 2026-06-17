import { CloudflareAiRerankerProvider } from "../src/embeddings/cloudflare-ai-reranker-provider";
import { expect, test } from "./test-kit";

test("Reranker retorna array vazio se não houver documentos", async () => {
  const provider = new CloudflareAiRerankerProvider({
    run: async () => {
      throw new Error("Não deve ser chamado");
    }
  });

  const result = await provider.rerank("query", []);
  expect(result.length).toBe(0);
});

test("Reranker retorna resultados ordenados pelo modelo em caso de sucesso", async () => {
  const provider = new CloudflareAiRerankerProvider({
    run: async (model, input) => {
      expect(model).toBe("@cf/baai/bge-reranker-base");
      expect(input.query).toBe("auth");
      expect(input.documents.length).toBe(2);
      // Retorna scores invertidos para simular o modelo preferindo o segundo documento
      return [
        { index: 1, score: 0.99 },
        { index: 0, score: 0.12 }
      ];
    }
  });

  const result = await provider.rerank("auth", ["docA", "docB"]);
  expect(result.length).toBe(2);
  expect(result[0]!.index).toBe(1);
  expect(result[0]!.score).toBe(0.99);
  expect(result[1]!.index).toBe(0);
});

test("Reranker fallback para ordem original em caso de erro na API da Cloudflare", async () => {
  const provider = new CloudflareAiRerankerProvider({
    run: async () => {
      throw new Error("Cloudflare AI Gateway Timeout");
    }
  });

  const result = await provider.rerank("query timeout", ["doc1", "doc2", "doc3"]);
  // Como falhou, deve fazer fallback silencioso (apenas loga o erro)
  // E retornar a ordem original { index, score: 0 }
  expect(result.length).toBe(3);
  expect(result[0]!.index).toBe(0);
  expect(result[0]!.score).toBe(0);
  expect(result[1]!.index).toBe(1);
  expect(result[1]!.score).toBe(0);
  expect(result[2]!.index).toBe(2);
});
