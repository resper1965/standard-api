import { GapApprovalService, GapDraftService, GapReviewService } from "@aegis/gap-analysis";
import { PoamApprovalService, PoamDraftService, PoamReviewService, createInMemoryPoamDependencies } from "@aegis/poam";
import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@aegis/scf-core";
import { SoaApprovalService, SoaDraftService, SoaReviewService, createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryGapAnalysisDependencies } from "../../gap-analysis/src/index";
import { createInMemoryReportingDependencies } from "../src/index";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  otherTenantId: "22222222-2222-4222-8222-222222222222",
  organizationId: "33333333-3333-4333-8333-333333333333",
  assessmentId: "44444444-4444-4444-8444-444444444444",
  actorId: "55555555-5555-4555-8555-555555555555",
  approvalId: "66666666-6666-4666-8666-666666666666",
  frameworkId: SYNTHETIC_FRAMEWORK_ID,
  scfVersionId: SYNTHETIC_SCF_VERSION_ID,
  traceId: "trace-reporting-test"
};

export const context = {
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  traceId: ids.traceId
};

export const createApprovedSourceFixture = async (withPoam = false) => {
  const soa = createInMemorySoaDependencies();
  const soaDraft = await new SoaDraftService(soa).createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const soaReview = await new SoaReviewService(soa).submitSoaForReview(soaDraft.soa_version_id, context);
  const approvedSoa = await new SoaApprovalService(soa).approveSoa(soaReview.soa_version_id, { approval_event_id: ids.approvalId }, context);

  const gapAnalysis = createInMemoryGapAnalysisDependencies({ soa, scf: soa.scf });
  const gapDraft = await new GapDraftService(gapAnalysis).createGapAnalysisDraft(ids.assessmentId, approvedSoa.soa_version_id, context);
  const gapReview = await new GapReviewService(gapAnalysis).submitGapAnalysisForReview(gapDraft.gap_analysis_version_id, context, "Synthetic readiness.");
  const approvedGap = await new GapApprovalService(gapAnalysis).approveGapAnalysis(gapReview.gap_analysis_version_id, { approval_event_id: ids.approvalId }, context);

  const poam = createInMemoryPoamDependencies({ gapAnalysis, scf: soa.scf });
  let approvedPoam = undefined;
  if (withPoam) {
    const poamDraft = await new PoamDraftService(poam).createPoamDraft(ids.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
    const poamReview = await new PoamReviewService(poam).submitPoamForReview(poamDraft.poam_version_id, context);
    approvedPoam = await new PoamApprovalService(poam).approvePoam(poamReview.poam_version_id, { approval_event_id: ids.approvalId }, context);
  }

  const reporting = createInMemoryReportingDependencies({ soa, gapAnalysis, poam, scf: soa.scf });
  return { soa, gapAnalysis, poam, reporting, approvedSoa, approvedGap, approvedPoam };
};
