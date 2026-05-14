import { ReportDraftService, ReportRendererService, ReportStorageService } from "../src/index";
import { context, createApprovedSourceFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("reports e artifacts respeitam tenant isolation", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const rendered = await new ReportRendererService(reporting).renderJson(draft.report_version_id, context);
  await new ReportStorageService(reporting).storeArtifact(draft.report_version_id, rendered, context);
  const reports = await reporting.repositories.versions.listByAssessment(context.assessmentId, ids.otherTenantId);
  const artifacts = await reporting.repositories.artifacts.listByReport(draft.report_version_id, ids.otherTenantId);
  expect(reports.length).toBe(0);
  expect(artifacts.length).toBe(0);
});

test("download URL respeita tenant e assessment", async () => {
  const { reporting } = await createApprovedSourceFixture(true);
  const draft = await new ReportDraftService(reporting).createReportDraft(context.assessmentId, "full_assessment_report", {}, context);
  const rendered = await new ReportRendererService(reporting).renderMarkdown(draft.report_version_id, context);
  const artifact = await new ReportStorageService(reporting).storeArtifact(draft.report_version_id, rendered, context);
  const url = await new ReportStorageService(reporting).generateDownloadUrl(artifact.report_artifact_id, context);
  expect(url).toContain(artifact.report_artifact_id);
  expect(url).toContain("expires_in=900");
});
