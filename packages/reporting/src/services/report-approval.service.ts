// @ts-nocheck -- Zod v4 CI type compat
import type { ReportVersionResponse } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { ReportingContext, ReportingDependencies } from "../types";
import { ReportValidationService } from "./report-validation.service";

export class ReportApprovalService {
  constructor(private readonly deps: ReportingDependencies) {}

  async validateReportForApproval(reportVersionId: string, context: ReportingContext) {
    return new ReportValidationService(this.deps).validateReportForReview(reportVersionId, context);
  }

  async approveReport(reportVersionId: string, approvalEvent: { approval_event_id?: string }, context: ReportingContext): Promise<ReportVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (!approvalEvent.approval_event_id) throw new ReportingWorkflowError("APPROVAL_EVENT_REQUIRED", "Report approval requires a formal approval_event_id.");
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    if (report.status !== "under_review") throw new ReportingWorkflowError("REPORT_APPROVAL_BLOCKED", "Only under_review reports can be approved.");
    const validation = await this.validateReportForApproval(reportVersionId, context);
    if (!validation.valid) throw new ReportingWorkflowError("REPORT_APPROVAL_BLOCKED", "Report validation failed.", { validation });
    const approved: ReportVersionResponse = {
      ...report,
      status: "approved",
      approved_by: context.actorId!,
      approved_at: new Date().toISOString(),
      approval_event_id: approvalEvent.approval_event_id,
      trace_id: context.traceId
    };
    await this.deps.repositories.versions.update(approved);
    await this.supersedePreviousApprovedReports(report.assessment_id, approved.report_version_id, approved.report_type, context);
    return approved;
  }

  async supersedePreviousApprovedReports(assessmentId: string, approvedReportVersionId: string, reportType: string, context: ReportingContext): Promise<void> {
    const versions = await this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
    for (const version of versions) {
      if (version.report_version_id !== approvedReportVersionId && version.report_type === reportType && version.status === "approved") {
        await this.deps.repositories.versions.update({ ...version, status: "superseded", superseded_by: approvedReportVersionId, trace_id: context.traceId });
      }
    }
  }
}


