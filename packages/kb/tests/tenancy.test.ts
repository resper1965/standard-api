import { KbIndexingService, KbSearchService, processKbEmbeddingJob } from "../src";
import { createKbFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Search não retorna resultado de outro tenant", async () => {
  const deps = await createKbFixture();
  const indexing = new KbIndexingService(deps);
  const indexResult = await indexing.indexAssessment({
    tenantId: ids.tenantId,
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    traceId: "trace-test"
  });
  const job = await deps.repositories.embeddingJobs.getJob(indexResult.queued_job_ids[0]!, ids.tenantId);
  await processKbEmbeddingJob({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    document_id: ids.documentId,
    chunk_id: ids.chunkId,
    vector_reference_id: indexResult.vector_reference_ids[0]!,
    job_id: job!.job_id,
    embedding_model: job!.embedding_model,
    vector_index_name: job!.vector_index_name,
    trace_id: "trace-test",
    created_at: job!.queued_at
  }, deps);

  const search = new KbSearchService(deps);
  const result = await search.semanticSearch({
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    traceId: "trace-test"
  }, {
    query: "access control",
    search_type: "semantic",
    filters: {},
    top_k: 5,
    include_context: false
  });

  expect(result.data.length).toBe(0);
});
