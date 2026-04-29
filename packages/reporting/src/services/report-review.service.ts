import type { ReportVersionResponse } from "@aegis/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { ReportMetadataPatch, ReportingContext, ReportingDependencies } from "../types";
import { ReportValidationService } from "./report-validation.service";

export class ReportReviewService {
  constructor(private readonly deps: ReportingDependencies) {}

  async submitReportForReview(reportVersionId: string, context: ReportingContext): Promise<ReportVersionResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.requireEditable(reportVersionId, context);
    const validation = await new ReportValidationService(this.deps).validateReportForReview(reportVersionId, context);
    if (!validation.valid) throw new ReportingWorkflowError("REPORT_REVIEW_BLOCKED", "Report cannot be submitted for review while validation errors exist.", { validation });
    const next: ReportVersionResponse = { ...report, status: "under_review", submitted_for_review_at: new Date().toISOString(), trace_id: context.traceId };
    await this.deps.repositories.versions.update(next);
    return next;
  }

  async updateReportMetadata(reportVersionId: string, patch: ReportMetadataPatch, context: ReportingContext): Promise<ReportVersionResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.requireEditable(reportVersionId, context);
    const next: ReportVersionResponse = {
      ...report,
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.metadata ? { metadata: { ...report.metadata, ...patch.metadata } } : {}),
      trace_id: context.traceId
    };
    await this.deps.repositories.versions.update(next);
    return next;
  }

  private async requireEditable(reportVersionId: string, context: ReportingContext): Promise<ReportVersionResponse> {
    const report = await this.deps.repositories.versions.get(reportVersionId, context.tenantId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    if (report.status === "approved") throw new ReportingWorkflowError("REPORT_IMMUTABLE", "Approved report versions are immutable.");
    return report;
  }
}
