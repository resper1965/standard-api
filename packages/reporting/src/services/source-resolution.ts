// @ts-nocheck -- Zod v4 CI type compat
import { MATURITY_REPORT_LIMITATION, POAM_REPORT_LIMITATION } from "../constants";
import { ReportingWorkflowError } from "../errors";
import type { CreateReportDraftOptions, ReportingContext, ReportingDependencies } from "../types";

const latestApproved = <T extends { status: string; created_at: string }>(items: T[]): T | undefined =>
  items.filter((item) => item.status === "approved").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

export const resolveReportSources = async (
  deps: ReportingDependencies,
  assessmentId: string,
  reportType: string,
  options: CreateReportDraftOptions,
  context: ReportingContext
) => {
  const soaVersions = await deps.soa.repositories.versions.listByAssessment(assessmentId, context.organizationId);
  const gapVersions = await deps.gapAnalysis.repositories.gapVersions.listByAssessment(assessmentId, context.organizationId);
  const poamVersions = deps.poam ? await deps.poam.repositories.versions.listByAssessment(assessmentId, context.organizationId) : [];

  const sourceSoa = options.source_soa_version_id
    ? await deps.soa.repositories.versions.get(options.source_soa_version_id, context.organizationId)
    : latestApproved(soaVersions);
  const sourceGap = options.source_gap_analysis_version_id
    ? await deps.gapAnalysis.repositories.gapVersions.get(options.source_gap_analysis_version_id, context.organizationId)
    : latestApproved(gapVersions);
  const sourcePoam = options.source_poam_version_id
    ? await deps.poam?.repositories.versions.get(options.source_poam_version_id, context.organizationId)
    : latestApproved(poamVersions);
  const sourceMaturity = options.source_maturity_assessment_version_id
    ? { maturity_assessment_version_id: options.source_maturity_assessment_version_id, status: "approved" as const }
    : await deps.maturity?.findApprovedByAssessment(assessmentId, context.organizationId);

  const limitations: string[] = [];
  const sourceStatus: Record<string, string> = {};

  if (sourceSoa) sourceStatus.soa = sourceSoa.status;
  if (sourceGap) sourceStatus.gap_analysis = sourceGap.status;
  if (sourceMaturity) sourceStatus.maturity_assessment = sourceMaturity.status;
  if (sourcePoam) sourceStatus.poam = sourcePoam.status;

  if (reportType === "full_assessment_report") {
    if (!sourceSoa || sourceSoa.status !== "approved") {
      if (!options.allow_unapproved_sources) throw new ReportingWorkflowError("APPROVED_SOA_REQUIRED", "Full report requires approved SoA.");
      limitations.push(options.exception_rationale ?? "Full report generated with explicit SoA exception.");
    }
    if (!sourceGap || sourceGap.status !== "approved") {
      if (!options.allow_unapproved_sources) throw new ReportingWorkflowError("APPROVED_GAP_ANALYSIS_REQUIRED", "Full report requires approved Gap Analysis.");
      limitations.push(options.exception_rationale ?? "Full report generated with explicit Gap Analysis exception.");
    }
    if (!sourceMaturity) limitations.push(MATURITY_REPORT_LIMITATION);
    if (!sourcePoam) limitations.push(POAM_REPORT_LIMITATION);
  }

  return { sourceSoa, sourceGap, sourceMaturity, sourcePoam, limitations, sourceStatus };
};

