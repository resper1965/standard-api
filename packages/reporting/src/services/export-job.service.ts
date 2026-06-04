import type { ExportJobResponse, ReportFormat } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { ReportType, ReportingContext, ReportingDependencies } from "../types";
import { ReportDraftService } from "./report-draft.service";
import { ReportRendererService } from "./report-renderer.service";
import { ReportStorageService } from "./report-storage.service";

export class ExportJobService {
  constructor(private readonly deps: ReportingDependencies) {}

  async requestExport(assessmentId: string, format: ReportFormat, reportType: ReportType, context: ReportingContext): Promise<ExportJobResponse> {
    assertContext(context);
    assertActor(context);
    const now = new Date().toISOString();
    const job: ExportJobResponse = {
      export_job_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: assessmentId,
      job_type: "report_export",
      status: "queued",
      requested_format: format,
      requested_by: context.actorId!,
      queued_at: now,
      trace_id: context.traceId,
      metadata: { report_type: reportType }
    };
    await this.deps.repositories.exportJobs.save(job);
    try {
      const running: ExportJobResponse = { ...job, status: "running", started_at: new Date().toISOString() };
      await this.deps.repositories.exportJobs.update(running);
      const report = await new ReportDraftService(this.deps).createReportDraft(assessmentId, reportType, {}, context);
      const rendered = format === "markdown"
        ? await new ReportRendererService(this.deps).renderMarkdown(report.report_version_id, context)
        : await new ReportRendererService(this.deps).renderJson(report.report_version_id, context);
      const artifact = await new ReportStorageService(this.deps).storeArtifact(report.report_version_id, rendered, context);
      const succeeded: ExportJobResponse = {
        ...running,
        status: "succeeded",
        report_version_id: report.report_version_id,
        completed_at: new Date().toISOString(),
        metadata: { ...running.metadata, artifact_id: artifact.report_artifact_id }
      };
      await this.deps.repositories.exportJobs.update(succeeded);
      return succeeded;
    } catch (error) {
      const failed: ExportJobResponse = {
        ...job,
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: error instanceof ReportingWorkflowError ? error.code : "EXPORT_JOB_FAILED",
        error_message_safe: error instanceof Error ? error.message.split(":")[0] : "Export failed safely.",
        metadata: { ...job.metadata, failed_safely: true }
      };
      await this.deps.repositories.exportJobs.update(failed);
      return failed;
    }
  }

  async getExportJob(exportJobId: string, context: ReportingContext): Promise<ExportJobResponse> {
    assertContext(context);
    const job = await this.deps.repositories.exportJobs.get(exportJobId, context.organizationId);
    if (!job || job.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("EXPORT_JOB_NOT_FOUND", "Export job not found.");
    return job;
  }

  async listExportJobs(assessmentId: string, context: ReportingContext): Promise<ExportJobResponse[]> {
    assertContext(context);
    return this.deps.repositories.exportJobs.listByAssessment(assessmentId, context.organizationId);
  }
}

