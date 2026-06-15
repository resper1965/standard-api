// @ts-nocheck -- Zod v4 CI type compat
import type { ReportValidationResponse } from "@standard/schemas";
import { assertContext, ReportingWorkflowError } from "../errors";
import type { ReportType, ReportingContext, ReportingDependencies } from "../types";
import { resolveReportSources } from "./source-resolution";

export class ReportValidationService {
  constructor(private readonly deps: ReportingDependencies) {}

  async validateSourcesForReport(assessmentId: string, reportType: ReportType, context: ReportingContext): Promise<ReportValidationResponse> {
    assertContext(context);
    const warnings: string[] = [];
    const errors: string[] = [];
    const unapproved: string[] = [];
    try {
      const sources = await resolveReportSources(this.deps, assessmentId, reportType, {}, context);
      if (sources.limitations.length) warnings.push(...sources.limitations);
    } catch (error) {
      if (error instanceof ReportingWorkflowError) {
        errors.push(error.code);
        unapproved.push(error.code.replace("APPROVED_", "").replace("_REQUIRED", "").toLowerCase());
      } else {
        throw error;
      }
    }
    return { valid: errors.length === 0, errors, warnings, unapproved_sources: unapproved, missing_traceability: [], trace_id: context.traceId };
  }

  async validateReportForReview(reportVersionId: string, context: ReportingContext): Promise<ReportValidationResponse> {
    assertContext(context);
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    const unapproved = await this.detectUnapprovedSources(reportVersionId, context);
    const missingTraceability = await this.detectMissingTraceability(reportVersionId, context);
    const errors = [...unapproved.map((source) => `UNAPPROVED_SOURCE:${source}`), ...missingTraceability.map((source) => `MISSING_TRACEABILITY:${source}`)];
    return {
      valid: errors.length === 0,
      errors,
      warnings: report.metadata.limitations,
      unapproved_sources: unapproved,
      missing_traceability: missingTraceability,
      trace_id: context.traceId
    };
  }

  async detectUnapprovedSources(reportVersionId: string, context: ReportingContext): Promise<string[]> {
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    const unapproved: string[] = [];
    if (report.source_soa_version_id) {
      const soa = await this.deps.soa.repositories.versions.get(report.source_soa_version_id, context.organizationId);
      if (!soa || soa.status !== "approved") unapproved.push("soa");
    }
    if (report.source_gap_analysis_version_id) {
      const gap = await this.deps.gapAnalysis.repositories.gapVersions.get(report.source_gap_analysis_version_id, context.organizationId);
      if (!gap || gap.status !== "approved") unapproved.push("gap_analysis");
    }
    if (report.source_poam_version_id && this.deps.poam) {
      const poam = await this.deps.poam.repositories.versions.get(report.source_poam_version_id, context.organizationId);
      if (!poam || poam.status !== "approved") unapproved.push("poam");
    }
    return unapproved;
  }

  async detectMissingTraceability(reportVersionId: string, context: ReportingContext): Promise<string[]> {
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    const missing: string[] = [];
    if (report.report_type === "full_assessment_report" && !report.source_soa_version_id) missing.push("source_soa_version_id");
    if (report.report_type === "full_assessment_report" && !report.source_gap_analysis_version_id) missing.push("source_gap_analysis_version_id");
    if (!report.framework_id) missing.push("framework_id");
    if (!report.scf_version_id) missing.push("scf_version_id");
    return missing;
  }
}


