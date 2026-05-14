import { MockEmbeddingProvider, MockVectorStore } from "../src";
import { expect, test } from "./test-kit";

test("MockEmbeddingProvider retorna dimensão consistente", async () => {
  const provider = new MockEmbeddingProvider("mock", 8);
  const embedding = await provider.embedText("synthetic evidence");
  expect(embedding.dimensions).toBe(8);
  expect(embedding.vector.length).toBe(8);
});

test("MockVectorStore faz upsert e query com filtro de tenant", async () => {
  const store = new MockVectorStore();
  const provider = new MockEmbeddingProvider("mock", 8);
  const embedding = await provider.embedText("access control policy");
  await store.upsert([
    {
      id: "vec-1",
      values: embedding.vector,
      metadata: {
        tenant_id: "11111111-1111-4111-8111-111111111111",
        organization_id: "22222222-2222-4222-8222-222222222222",
        assessment_id: "33333333-3333-4333-8333-333333333333",
        document_id: "44444444-4444-4444-8444-444444444444",
        chunk_id: "55555555-5555-4555-8555-555555555555",
        content_hash: "hash",
        text_hash: "text-hash",
        document_type: "policy",
        created_at: "2026-01-01T00:00:00.000Z"
      }
    }
  ]);
  const results = await store.query(embedding.vector, { tenant_id: "11111111-1111-4111-8111-111111111111" }, { topK: 5 });
  expect(results.length).toBe(1);
});
