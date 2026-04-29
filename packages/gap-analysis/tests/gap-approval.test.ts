import { EvidenceAnalysisService, GapApprovalService, GapDraftService, GapReviewService } from "../src/index";
import { context, createApprovedSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

const createReviewReadyGap = async () => {
  const fixture = await createApprovedSoaFixture();
  await new EvidenceAnalysisService(fixture.gap).runEvidenceAnalysis(ids.assessmentId, fixture.approvedSoa.soa_version_id, context);
  const draft = await new GapDraftService(fixture.gap).createGapAnalysisDraft(ids.assessmentId, fixture.approvedSoa.soa_version_id, context);
  const underReview = await new GapReviewService(fixture.gap).submitGapAnalysisForReview(draft.gap_analysis_version_id, context);
  return { ...fixture, underReview };
};

test("not_met só é permitido com rationale explícita", async () => {
  const { gap, underReview } = await createReviewReadyGap();
  const findings = await new GapDraftService(gap).listGapFindings(underReview.gap_analysis_version_id, {}, context);
  await expectRejects(() => new GapReviewService(gap).updateGapFinding(findings[0]!.gap_finding_id, {
    assessment_status: "not_met"
  }, context), "GAP_RATIONALE_REQUIRED");
});

test("Approval sem actor_id é bloqueado", async () => {
  const { gap, underReview } = await createReviewReadyGap();
  const { actorId: _actorId, ...contextWithoutActor } = context;
  await expectRejects(() => new GapApprovalService(gap).approveGapAnalysis(underReview.gap_analysis_version_id, {
    approval_event_id: ids.approvalId
  }, contextWithoutActor), "ACTOR_REQUIRED");
});

test("Approval sem approval_event é bloqueado", async () => {
  const { gap, underReview } = await createReviewReadyGap();
  await expectRejects(() => new GapApprovalService(gap).approveGapAnalysis(underReview.gap_analysis_version_id, {}, context), "APPROVAL_EVENT_REQUIRED");
});

test("Approval válido marca versão como approved e bloqueia edição posterior", async () => {
  const { gap, underReview } = await createReviewReadyGap();
  const approved = await new GapApprovalService(gap).approveGapAnalysis(underReview.gap_analysis_version_id, {
    approval_event_id: ids.approvalId
  }, context);
  const findings = await new GapDraftService(gap).listGapFindings(approved.gap_analysis_version_id, {}, context);
  expect(approved.status).toBe("approved");
  await expectRejects(() => new GapReviewService(gap).updateGapFinding(findings[0]!.gap_finding_id, {
    severity: "high"
  }, context), "GAP_ANALYSIS_IMMUTABLE");
});
