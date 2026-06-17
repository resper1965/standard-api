import { KbIndexingService, KbSearchService, processKbEmbeddingJob } from "../src";
import { createKbFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Search limita top_k, retorna candidate evidence e registra hash", async () => {
  const deps = await createKbFixture();
  // Injeta um mock do Reranker para o teste
  deps.rerankerProvider = {
    rerank: async (query, documents) => {
      // Mock simples: inverte a ordem dos documentos
      return documents.map((_, i) => ({ index: documents.length - 1 - i, score: 0.9 })).sort((a, b) => b.score - a.score);
    }
  };
  const indexing = new KbIndexingService(deps);
  const indexResult = await indexing.indexAssessment({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    actorId: ids.actorId,
    traceId: "trace-test"
  });
  const job = await deps.repositories.embeddingJobs.getJob(indexResult.queued_job_ids[0]!, ids.organizationId);
  await processKbEmbeddingJob({
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    document_id: ids.documentId,
    chunk_id: ids.chunkId,
    vector_reference_id: indexResult.vector_reference_ids[0]!,
    job_id: job!.job_id,
    embedding_model: job!.embedding_model,
    vector_index_name: job!.vector_index_name,
    trace_id: "trace-test",
    requested_by: ids.actorId,
    created_at: job!.queued_at
  }, deps);

  const search = new KbSearchService(deps);
  const result = await search.semanticSearch({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    actorId: ids.actorId,
    traceId: "trace-test"
  }, {
    query: "access control",
    search_type: "semantic",
    filters: {},
    top_k: 20,
    include_context: false
  });

  const logs = await deps.repositories.searchLogs.list();
  expect(result.candidate_evidence).toBe(true);
  expect(result.data.length).toBe(1);
  expect(result.data[0]!.chunk_id).toBe(ids.chunkId);
  // Garante que o provider setou a flag
  expect(result.data[0]!.reranked).toBe(true);

  expect(logs.length).toBe(1);
  expect(Boolean(logs[0]!.query_hash)).toBe(true);
  expect(JSON.stringify(logs[0]).includes("access control")).toBe(false);
});
