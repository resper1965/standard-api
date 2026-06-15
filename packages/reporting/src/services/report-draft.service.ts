// @ts-nocheck -- Zod v4 CI type compat
import type { ReportVersionResponse } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { CreateReportDraftOptions, ReportType, ReportingContext, ReportingDependencies } from "../types";
import { resolveReportSources } from "./source-resolution";

export class ReportDraftService {
  constructor(private readonly deps: ReportingDependencies) {}

  async createReportDraft(assessmentId: string, reportType: ReportType, options: CreateReportDraftOptions, context: ReportingContext): Promise<ReportVersionResponse> {
    assertContext(context);
    assertActor(context);
    const sources = await resolveReportSources(this.deps, assessmentId, reportType, options, context);
    const existing = await this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
    const versionNumber = existing.filter((version) => version.report_type === reportType).length + 1;
    const now = new Date().toISOString();
    const draft: ReportVersionResponse = {
      report_version_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: assessmentId,
      version_number: versionNumber,
      status: "draft",
      report_type: reportType,
      title: options.title ?? "Synthetic Standard Assessment Report",
      ...(sources.sourceSoa?.source_scope_id ? { source_scope_id: sources.sourceSoa.source_scope_id } : {}),
      ...(sources.sourceSoa ? { source_soa_version_id: sources.sourceSoa.soa_version_id } : {}),
      ...(sources.sourceGap ? { source_gap_analysis_version_id: sources.sourceGap.gap_analysis_version_id } : {}),
      ...(sources.sourceMaturity ? { source_maturity_assessment_version_id: sources.sourceMaturity.maturity_assessment_version_id } : {}),
      ...(sources.sourcePoam ? { source_poam_version_id: sources.sourcePoam.poam_version_id } : {}),
      ...(sources.sourceSoa?.source_framework_id ? { framework_id: sources.sourceSoa.source_framework_id } : sources.sourceGap?.framework_id ? { framework_id: sources.sourceGap.framework_id } : {}),
      ...(sources.sourceSoa?.scf_version_id ? { scf_version_id: sources.sourceSoa.scf_version_id } : sources.sourceGap?.scf_version_id ? { scf_version_id: sources.sourceGap.scf_version_id } : {}),
      created_by: context.actorId!,
      created_at: now,
      trace_id: context.traceId,
      metadata: {
        limitations: sources.limitations,
        assumptions: ["Report content is derived from approved lifecycle artifacts and synthetic test fixtures in this MVP."],
        source_status: sources.sourceStatus
      }
    };
    await this.deps.repositories.versions.save(draft);
    return draft;
  }

  async regenerateReportDraft(reportVersionId: string, options: CreateReportDraftOptions, context: ReportingContext): Promise<ReportVersionResponse> {
    const current = await this.getReportVersion(reportVersionId, context);
    if (current.status !== "approved") {
      return this.createReportDraft(current.assessment_id, current.report_type, { ...options, title: options.title ?? current.title }, context);
    }
    const next = await this.createReportDraft(current.assessment_id, current.report_type, { ...options, title: options.title ?? current.title }, context);
    await this.deps.repositories.versions.update({ ...current, superseded_by: next.report_version_id, status: "superseded" });
    return next;
  }

  async getReportVersion(reportVersionId: string, context: ReportingContext): Promise<ReportVersionResponse> {
    assertContext(context);
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    return report;
  }

  async listReportVersions(assessmentId: string, context: ReportingContext): Promise<ReportVersionResponse[]> {
    assertContext(context);
    return this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
  }
}


