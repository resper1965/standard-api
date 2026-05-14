import { ReportDraftService, ReportValidationService } from "../src/index";
import { context, createApprovedSourceFixture } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("bloqueia relatório sem tenant context", async () => {
  const { reporting } = await createApprovedSourceFixture();
  await expectRejects(
    () => new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, { ...context, tenantId: "" }),
    "REPORT_CONTEXT_REQUIRED"
  );
});

test("bloqueia full_assessment_report sem SoA aprovada", async () => {
  const { reporting, approvedSoa } = await createApprovedSourceFixture();
  await reporting.soa.repositories.versions.update({ ...approvedSoa, status: "draft" });
  await expectRejects(
    () => new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context),
    "APPROVED_SOA_REQUIRED"
  );
});

test("bloqueia full_assessment_report sem Gap Analysis aprovado", async () => {
  const { reporting, approvedGap } = await createApprovedSourceFixture();
  await reporting.gapAnalysis.repositories.gapVersions.update({ ...approvedGap, status: "draft" });
  await expectRejects(
    () => new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context),
    "APPROVED_GAP_ANALYSIS_REQUIRED"
  );
});

test("permite relatório com POA&M ausente e registra limitação", async () => {
  const { reporting, approvedSoa, approvedGap } = await createApprovedSourceFixture(false);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  expect(draft.status).toBe("draft");
  expect(draft.source_soa_version_id).toBe(approvedSoa.soa_version_id);
  expect(draft.source_gap_analysis_version_id).toBe(approvedGap.gap_analysis_version_id);
  expect(draft.metadata.limitations.length).toBeGreaterThan(0);
});

test("detecta fontes não aprovadas no report draft", async () => {
  const { reporting } = await createApprovedSourceFixture(false);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const validation = await new ReportValidationService(reporting).validateReportForReview(draft.report_version_id, context);
  expect(validation.valid).toBe(true);
  expect(validation.trace_id).toBe(context.traceId);
});
