import { KbIndexingService, processKbEmbeddingJob } from "@aegis/kb";
import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@aegis/scf-core";
import { SoaApprovalService, SoaDraftService, SoaReviewService, createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryGapAnalysisDependencies } from "../src/index";
import { createKbFixture, ids as kbIds } from "../../kb/tests/helpers";

export const ids = {
  tenantId: kbIds.tenantId,
  organizationId: kbIds.organizationId,
  assessmentId: kbIds.assessmentId,
  actorId: kbIds.actorId,
  documentId: kbIds.documentId,
  chunkId: kbIds.chunkId,
  approvalId: "77777777-7777-4777-8777-777777777777",
  frameworkId: SYNTHETIC_FRAMEWORK_ID,
  scfVersionId: SYNTHETIC_SCF_VERSION_ID,
  traceId: "trace-gap-test"
};

export const context = {
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  traceId: ids.traceId
};

export const createApprovedSoaFixture = async (withKbEvidence = false) => {
  const kb = await createKbFixture();
  if (withKbEvidence) {
    const indexed = await new KbIndexingService(kb).indexAssessment(context, { force_reindex: false });
    await processKbEmbeddingJob({
      job_id: indexed.queued_job_ids[0]!,
      tenant_id: ids.tenantId,
      organization_id: ids.organizationId,
      assessment_id: ids.assessmentId,
      document_id: ids.documentId,
      chunk_id: ids.chunkId,
      vector_reference_id: indexed.vector_reference_ids[0]!,
      embedding_model: kb.embeddingProvider.getModelInfo().model,
      vector_index_name: kb.vectorIndexName,
      trace_id: ids.traceId,
      created_at: new Date().toISOString()
    }, kb);
  }

  const soa = createInMemorySoaDependencies({ kb });
  const draftService = new SoaDraftService(soa);
  const reviewService = new SoaReviewService(soa);
  const approvalService = new SoaApprovalService(soa);
  const draft = await draftService.createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const submitted = await reviewService.submitSoaForReview(draft.soa_version_id, context);
  const approved = await approvalService.approveSoa(submitted.soa_version_id, { approval_event_id: ids.approvalId }, context);
  const gap = createInMemoryGapAnalysisDependencies({ kb, soa });
  return { kb, soa, gap, approvedSoa: approved };
};
