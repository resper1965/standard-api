import { GapApprovalService, GapDraftService, GapReviewService, type GapAnalysisDependencies } from "@standard/gap-analysis";
import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@standard/scf-core";
import type { GapFindingResponse } from "@standard/schemas";
import { SoaApprovalService, SoaDraftService, SoaReviewService, createInMemorySoaDependencies } from "@standard/soa";
import { createInMemoryGapAnalysisDependencies } from "../../gap-analysis/src/index";
import { createInMemoryPoamDependencies } from "../src/index";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  otherTenantId: "22222222-2222-4222-8222-222222222222",
  organizationId: "33333333-3333-4333-8333-333333333333",
  assessmentId: "44444444-4444-4444-8444-444444444444",
  actorId: "55555555-5555-4555-8555-555555555555",
  approvalId: "66666666-6666-4666-8666-666666666666",
  frameworkId: SYNTHETIC_FRAMEWORK_ID,
  scfVersionId: SYNTHETIC_SCF_VERSION_ID,
  traceId: "trace-poam-test"
};

export const context = {
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  traceId: ids.traceId
};

export const createApprovedGapFixture = async () => {
  const soa = createInMemorySoaDependencies();
  const soaDraft = await new SoaDraftService(soa).createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const soaReview = await new SoaReviewService(soa).submitSoaForReview(soaDraft.soa_version_id, context);
  const approvedSoa = await new SoaApprovalService(soa).approveSoa(soaReview.soa_version_id, { approval_event_id: ids.approvalId }, context);
  const gap = createInMemoryGapAnalysisDependencies({ soa });
  const gapDraft = await new GapDraftService(gap).createGapAnalysisDraft(ids.assessmentId, approvedSoa.soa_version_id, context);
  const findings = await gap.repositories.gapFindings.listByVersion(gapDraft.gap_analysis_version_id, ids.tenantId);
  const submitted = await new GapReviewService(gap).submitGapAnalysisForReview(gapDraft.gap_analysis_version_id, context, "Synthetic test approval readiness.");
  const approvedGap = await new GapApprovalService(gap).approveGapAnalysis(submitted.gap_analysis_version_id, { approval_event_id: ids.approvalId }, context);
  const poam = createInMemoryPoamDependencies({ gapAnalysis: gap, scf: soa.scf });
  return { soa, gap, poam, approvedSoa, approvedGap, findings };
};

export const updateGapFinding = async (gap: GapAnalysisDependencies, finding: GapFindingResponse, patch: Partial<GapFindingResponse>): Promise<GapFindingResponse> => {
  const next = { ...finding, ...patch, updated_at: new Date().toISOString() };
  await gap.repositories.gapFindings.update(next);
  return next;
};

