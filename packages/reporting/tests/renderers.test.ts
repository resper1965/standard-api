import { ReportDraftService, ReportRendererService, ReportStorageService } from "../src/index";
import { context, createApprovedSourceFixture } from "./helpers";
import { expect, test } from "./test-kit";

test("JSON renderer gera export estruturado", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const rendered = await new ReportRendererService(reporting).renderJson(draft.report_version_id, context);
  expect(rendered.format).toBe("json");
  expect(rendered.content).toContain("traceability_appendix");
});

test("Markdown renderer gera relatório com seções mínimas", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const rendered = await new ReportRendererService(reporting).renderMarkdown(draft.report_version_id, context);
  expect(rendered.format).toBe("markdown");
  expect(rendered.content).toContain("# Synthetic Aegis Assessment Report");
  expect(rendered.content).toContain("## Traceability Appendix");
});

test("storage gera storage_key segura e content_hash", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const rendered = await new ReportRendererService(reporting).renderJson(draft.report_version_id, context);
  const artifact = await new ReportStorageService(reporting).storeArtifact(draft.report_version_id, rendered, context);
  expect(artifact.content_hash.length).toBe(64);
  expect(artifact.storage_key).toContain(`/assessments/${context.assessmentId}/reports/${draft.report_version_id}/`);
});
