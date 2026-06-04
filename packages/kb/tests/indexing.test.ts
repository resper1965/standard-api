import { KbIndexingService, processKbEmbeddingJob } from "../src";
import { createKbFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Indexing service cria jobs para chunks pendentes sem duplicar", async () => {
  const deps = await createKbFixture();
  const service = new KbIndexingService(deps);
  const first = await service.indexAssessment({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    actorId: ids.actorId,
    traceId: "trace-test"
  });
  const second = await service.indexAssessment({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    actorId: ids.actorId,
    traceId: "trace-test"
  });
  expect(first.queued_job_ids.length).toBe(1);
  expect(second.queued_job_ids.length).toBe(0);
});

test("Consumer processa chunk e atualiza vector_reference", async () => {
  const deps = await createKbFixture();
  const service = new KbIndexingService(deps);
  const result = await service.indexAssessment({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    actorId: ids.actorId,
    traceId: "trace-test"
  });
  const job = await deps.repositories.embeddingJobs.getJob(result.queued_job_ids[0]!, ids.organizationId);
  await processKbEmbeddingJob({
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    document_id: ids.documentId,
    chunk_id: ids.chunkId,
    vector_reference_id: result.vector_reference_ids[0]!,
    job_id: job!.job_id,
    embedding_model: job!.embedding_model,
    vector_index_name: job!.vector_index_name,
    trace_id: "trace-test",
    requested_by: ids.actorId,
    created_at: job!.queued_at
  }, deps);
  const updated = await deps.repositories.vectorReferences.get(result.vector_reference_ids[0]!, ids.organizationId);
  expect(updated?.embedding_status).toBe("embedded");
  expect(updated?.vector_id).toBeDefined();
});
