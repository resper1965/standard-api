/**
 * AuditPackageService â€” One-Click Audit Package Generator
 *
 * Orchestrates the creation of a comprehensive audit-ready package containing:
 * - Executive PDF report (print-optimized HTML)
 * - Gap analysis findings export
 * - Evidence attachment manifest
 * - Compliance gate snapshot
 *
 * @module @standard/reporting/services/audit-package.service
 */
import type { ExportJobResponse, SupportedLocale } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { ReportingContext, ReportingDependencies } from "../types";
import { ReportDraftService } from "./report-draft.service";
import { ReportRendererService } from "./report-renderer.service";
import { ReportStorageService } from "./report-storage.service";

export type AuditPackageArtifact = {
  name: string;
  format: string;
  mime_type: string;
  content: string;
};

export type AuditPackageResult = {
  export_job_id: string;
  assessment_id: string;
  status: "succeeded" | "failed";
  artifacts: AuditPackageArtifact[];
  trace_id: string;
  created_at: string;
};

export class AuditPackageService {
  constructor(private readonly deps: ReportingDependencies) {}

  async generatePackage(
    assessmentId: string,
    context: ReportingContext,
    locale: SupportedLocale = "pt-BR"
  ): Promise<AuditPackageResult> {
    assertContext(context);
    assertActor(context);

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const artifacts: AuditPackageArtifact[] = [];

    // 1. Create & persist the export job record
    const job: ExportJobResponse = {
      export_job_id: jobId,
      organization_id: context.organizationId,
      assessment_id: assessmentId,
      job_type: "audit_package",
      status: "running",
      requested_format: "pdf",
      requested_by: context.actorId!,
      queued_at: now,
      started_at: now,
      trace_id: context.traceId,
      metadata: { locale, package_version: "1.0" },
    };
    await this.deps.repositories.exportJobs.save(job);

    try {
      // 2. Generate Executive PDF Report
      const draftService = new ReportDraftService(this.deps);
      const rendererService = new ReportRendererService(this.deps);
      const storageService = new ReportStorageService(this.deps);

      const report = await draftService.createReportDraft(assessmentId, "full_assessment_report", {}, context);
      const pdfRendered = await rendererService.renderPdf(report.report_version_id, context, locale);
      await storageService.storeArtifact(report.report_version_id, pdfRendered, context);

      artifacts.push({
        name: `executive-report-${assessmentId}.html`,
        format: "pdf",
        mime_type: pdfRendered.mime_type,
        content: pdfRendered.content,
      });

      // 3. Generate Markdown version (lightweight backup)
      const mdRendered = await rendererService.renderMarkdown(report.report_version_id, context);
      artifacts.push({
        name: `executive-report-${assessmentId}.md`,
        format: "markdown",
        mime_type: mdRendered.mime_type,
        content: mdRendered.content,
      });

      // 4. Generate JSON data export (machine-readable evidence)
      const jsonRendered = await rendererService.renderJson(report.report_version_id, context);
      artifacts.push({
        name: `assessment-data-${assessmentId}.json`,
        format: "json",
        mime_type: jsonRendered.mime_type,
        content: jsonRendered.content,
      });

      // 5. Mark job succeeded
      const succeeded: ExportJobResponse = {
        ...job,
        status: "succeeded",
        report_version_id: report.report_version_id,
        completed_at: new Date().toISOString(),
        metadata: {
          ...job.metadata,
          artifact_count: artifacts.length,
        },
      };
      await this.deps.repositories.exportJobs.update(succeeded);

      return {
        export_job_id: jobId,
        assessment_id: assessmentId,
        status: "succeeded",
        artifacts,
        trace_id: context.traceId,
        created_at: now,
      };
    } catch (error) {
      // Mark job failed
      const failed: ExportJobResponse = {
        ...job,
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: error instanceof ReportingWorkflowError ? error.code : "AUDIT_PACKAGE_FAILED",
        error_message_safe: error instanceof Error ? error.message.split(":")[0] : "Audit package generation failed.",
        metadata: { ...job.metadata, failed_safely: true },
      };
      await this.deps.repositories.exportJobs.update(failed);

      return {
        export_job_id: jobId,
        assessment_id: assessmentId,
        status: "failed",
        artifacts: [],
        trace_id: context.traceId,
        created_at: now,
      };
    }
  }
}

