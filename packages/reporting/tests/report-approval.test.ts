import { ReportApprovalService, ReportDraftService, ReportReviewService } from "../src/index";
import { context, createApprovedSourceFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

const createReviewReadyReport = async () => {
  const fixture = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(fixture.reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const submitted = await new ReportReviewService(fixture.reporting).submitReportForReview(draft.report_version_id, context);
  return { ...fixture, submitted };
};

test("approval sem actor_id é bloqueado", async () => {
  const { reporting, submitted } = await createReviewReadyReport();
  const { actorId: _actorId, ...contextWithoutActor } = context;
  await expectRejects(
    () => new ReportApprovalService(reporting).approveReport(submitted.report_version_id, { approval_event_id: ids.approvalId }, contextWithoutActor),
    "REPORT_ACTOR_REQUIRED"
  );
});

test("approval sem approval_event é bloqueado", async () => {
  const { reporting, submitted } = await createReviewReadyReport();
  await expectRejects(() => new ReportApprovalService(reporting).approveReport(submitted.report_version_id, {}, context), "APPROVAL_EVENT_REQUIRED");
});

test("approval válido marca relatório como approved e bloqueia metadata update", async () => {
  const { reporting, submitted } = await createReviewReadyReport();
  const approved = await new ReportApprovalService(reporting).approveReport(submitted.report_version_id, { approval_event_id: ids.approvalId }, context);
  expect(approved.status).toBe("approved");
  await expectRejects(
    () => new ReportReviewService(reporting).updateReportMetadata(approved.report_version_id, { title: "Updated title" }, context),
    "REPORT_IMMUTABLE"
  );
});
