import type { RenderReportResponse, SupportedLocale } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import { renderDocxArtifact } from "../renderers/docx-renderer";
import { renderJsonArtifact } from "../renderers/json-renderer";
import { renderMarkdownArtifact } from "../renderers/markdown-renderer";
import { renderPdfArtifact } from "../renderers/pdf-renderer";
import type { ReportingContext, ReportingDependencies } from "../types";
import { ReportComposerService } from "./report-composer.service";

export class ReportRendererService {
  constructor(private readonly deps: ReportingDependencies) {}

  async renderJson(
    reportVersionId: string,
    context: ReportingContext,
  ): Promise<RenderReportResponse> {
    return this.render(reportVersionId, "json", context);
  }

  async renderMarkdown(
    reportVersionId: string,
    context: ReportingContext,
  ): Promise<RenderReportResponse> {
    return this.render(reportVersionId, "markdown", context);
  }

  async renderHtml(
    reportVersionId: string,
    context: ReportingContext,
  ): Promise<RenderReportResponse> {
    const markdown = await this.renderMarkdown(reportVersionId, context);
    return {
      ...markdown,
      format: "html",
      mime_type: "text/html",
      content: `<pre>${markdown.content.replaceAll("<", "&lt;")}</pre>`,
    };
  }

  async renderDocx(
    reportVersionId: string,
    context: ReportingContext,
  ): Promise<RenderReportResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.deps.repositories.versions.get(
      reportVersionId,
      context.organizationId,
    );
    if (!report || report.assessment_id !== context.assessmentId)
      throw new ReportingWorkflowError(
        "REPORT_NOT_FOUND",
        "Report version not found.",
      );
    const sections = await new ReportComposerService(
      this.deps,
    ).composeFullAssessmentReport(reportVersionId, context);
    const artifact = renderDocxArtifact(
      report.title,
      reportVersionId,
      sections,
    );
    return {
      report_version_id: reportVersionId,
      artifact_type: artifact.artifact_type,
      format: artifact.format,
      mime_type: artifact.mime_type,
      content: artifact.content,
      trace_id: context.traceId,
    };
  }

  async renderPdf(
    reportVersionId: string,
    context: ReportingContext,
    locale?: SupportedLocale,
  ): Promise<RenderReportResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.deps.repositories.versions.get(
      reportVersionId,
      context.organizationId,
    );
    if (!report || report.assessment_id !== context.assessmentId)
      throw new ReportingWorkflowError(
        "REPORT_NOT_FOUND",
        "Report version not found.",
      );
    const sections = await new ReportComposerService(
      this.deps,
    ).composeFullAssessmentReport(reportVersionId, context);
    const artifact = renderPdfArtifact(
      report.title,
      reportVersionId,
      sections,
      locale,
    );
    return {
      report_version_id: reportVersionId,
      artifact_type: artifact.artifact_type,
      format: artifact.format,
      mime_type: artifact.mime_type,
      content: artifact.content,
      trace_id: context.traceId,
    };
  }

  private async render(
    reportVersionId: string,
    format: "json" | "markdown",
    context: ReportingContext,
  ): Promise<RenderReportResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.deps.repositories.versions.get(
      reportVersionId,
      context.organizationId,
    );
    if (!report || report.assessment_id !== context.assessmentId)
      throw new ReportingWorkflowError(
        "REPORT_NOT_FOUND",
        "Report version not found.",
      );
    const sections = await new ReportComposerService(
      this.deps,
    ).composeFullAssessmentReport(reportVersionId, context);
    const artifact =
      format === "json"
        ? renderJsonArtifact(reportVersionId, sections)
        : renderMarkdownArtifact(report.title, reportVersionId, sections);
    return {
      report_version_id: reportVersionId,
      artifact_type: artifact.artifact_type,
      format: artifact.format,
      mime_type: artifact.mime_type,
      content: artifact.content,
      trace_id: context.traceId,
    };
  }
}

