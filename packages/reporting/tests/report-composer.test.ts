import { ReportComposerService, ReportDraftService } from "../src/index";
import { context, createApprovedSourceFixture } from "./helpers";
import { expect, test } from "./test-kit";

test("cria report_version draft preservando fontes aprovadas", async () => {
  const { reporting, approvedSoa, approvedGap, approvedPoam } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  expect(draft.status).toBe("draft");
  expect(draft.source_soa_version_id).toBe(approvedSoa.soa_version_id);
  expect(draft.source_gap_analysis_version_id).toBe(approvedGap.gap_analysis_version_id);
  expect(draft.source_poam_version_id).toBe(approvedPoam!.poam_version_id);
});

test("composer gera seções mínimas e traceability appendix", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const sections = await new ReportComposerService(reporting).composeFullAssessmentReport(draft.report_version_id, context);
  expect(sections.length).toBeGreaterThan(10);
  expect(sections.some((section) => section.section_key === "traceability_appendix")).toBe(true);
  expect(sections.some((section) => section.section_key === "evidence_index")).toBe(true);
});
