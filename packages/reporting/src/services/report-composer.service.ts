import type { ReportSectionResponse, ReportVersionResponse } from "@standard/schemas";
import { assertContext, ReportingWorkflowError } from "../errors";
import type { ReportingContext, ReportingDependencies } from "../types";

const section = (
  reportVersionId: string,
  order: number,
  sectionKey: string,
  title: string,
  content: Record<string, unknown>,
  traceability: ReportSectionResponse["traceability"] = []
): ReportSectionResponse => ({
  section_id: crypto.randomUUID(),
  report_version_id: reportVersionId,
  section_key: sectionKey,
  title,
  order,
  content,
  traceability
});

export class ReportComposerService {
  constructor(private readonly deps: ReportingDependencies) {}

  async composeFullAssessmentReport(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    assertContext(context);
    const report = await this.requireReport(reportVersionId, context);
    return [
      section(reportVersionId, 1, "cover_metadata", "Cover / Metadata", {
        title: report.title,
        report_type: report.report_type,
        report_version: report.version_number,
        framework_id: report.framework_id,
        scf_version_id: report.scf_version_id,
        generated_at: new Date().toISOString()
      }),
      ...(await this.composeExecutiveSummary(reportVersionId, context)),
      section(reportVersionId, 3, "assessment_scope", "Assessment Scope", { source_scope_id: report.source_scope_id ?? null }, this.sourcesFor(report)),
      section(reportVersionId, 4, "methodology", "Methodology", {
        method: "Standard SCF-Based Assessment Lifecycle",
        note: "Report is derived from versioned approved artifacts."
      }),
      section(reportVersionId, 5, "scf_framework_basis", "SCF and Framework Basis", {
        framework_id: report.framework_id,
        scf_version_id: report.scf_version_id
      }),
      ...(await this.composeSoaSection(reportVersionId, context)),
      ...(await this.composeGapAnalysisSection(reportVersionId, context)),
      ...(await this.composeMaturitySection(reportVersionId, context)),
      ...(await this.composePoamSection(reportVersionId, context)),
      section(reportVersionId, 13, "limitations_assumptions", "Limitations and Assumptions", report.metadata),
      ...(await this.composeTraceabilityAppendix(reportVersionId, context)),
      ...(await this.composeEvidenceIndex(reportVersionId, context)),
      section(reportVersionId, 16, "approval_version_history", "Approval and Version History", {
        status: report.status,
        created_by: report.created_by,
        created_at: report.created_at,
        approved_by: report.approved_by ?? null,
        approved_at: report.approved_at ?? null
      })
    ];
  }

  async composeExecutiveSummary(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    return [section(reportVersionId, 2, "executive_summary", "Executive Summary", {
      source_status: report.metadata.source_status,
      limitation_count: report.metadata.limitations.length
    }, this.sourcesFor(report))];
  }

  async composeSoaSection(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    const items = report.source_soa_version_id ? await this.deps.soa.repositories.items.listByVersion(report.source_soa_version_id, context.organizationId) : [];
    const counts = this.countBy(items, "applicability_status");
    return [section(reportVersionId, 6, "soa_summary", "Statement of Applicability Summary", {
      source_soa_version_id: report.source_soa_version_id,
      item_count: items.length,
      applicability_counts: counts
    }, report.source_soa_version_id ? [{ source_type: "soa_version", source_id: report.source_soa_version_id }] : [])];
  }

  async composeGapAnalysisSection(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    const findings = report.source_gap_analysis_version_id ? await this.deps.gapAnalysis.repositories.gapFindings.listByVersion(report.source_gap_analysis_version_id, context.organizationId) : [];
    const details = findings.map((finding) => ({
      gap_finding_id: finding.gap_finding_id,
      gap_code: finding.gap_code,
      assessment_status: finding.assessment_status,
      severity: finding.severity,
      scf_control_id: finding.scf_control_id,
      gap_summary: finding.gap_summary,
      recommendation_summary: finding.recommendation_summary
    }));
    return [
      section(reportVersionId, 7, "gap_summary", "Evidence and Gap Analysis Summary", {
        source_gap_analysis_version_id: report.source_gap_analysis_version_id,
        finding_count: findings.length,
        status_counts: this.countBy(findings, "assessment_status")
      }, report.source_gap_analysis_version_id ? [{ source_type: "gap_analysis_version", source_id: report.source_gap_analysis_version_id }] : []),
      section(reportVersionId, 8, "detailed_gap_findings", "Detailed Gap Findings", { findings: details }, details.map((item) => ({ source_type: "gap_finding", source_id: item.gap_finding_id })))
    ];
  }

  async composeMaturitySection(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    return [
      section(reportVersionId, 9, "maturity_summary", "Maturity Assessment Summary", {
        source_maturity_assessment_version_id: report.source_maturity_assessment_version_id ?? null,
        limitation: report.source_maturity_assessment_version_id ? null : "Maturity Assessment not available in MVP fixture."
      }),
      section(reportVersionId, 10, "maturity_by_domain", "Maturity by Domain", { domains: [] })
    ];
  }

  async composePoamSection(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    const items = report.source_poam_version_id && this.deps.poam ? await this.deps.poam.repositories.items.listByVersion(report.source_poam_version_id, context.organizationId) : [];
    const details = items.map((item) => ({
      poam_item_id: item.poam_item_id,
      poam_code: item.poam_code,
      priority: item.priority,
      status: item.status,
      owner_role: item.owner_role,
      expected_evidence: item.expected_evidence,
      acceptance_criteria: item.acceptance_criteria
    }));
    return [
      section(reportVersionId, 11, "poam_summary", "POA&M Summary", {
        source_poam_version_id: report.source_poam_version_id ?? null,
        item_count: items.length,
        priority_counts: this.countBy(items, "priority")
      }),
      section(reportVersionId, 12, "detailed_poam", "Detailed POA&M", { items: details }, details.map((item) => ({ source_type: "poam_item", source_id: item.poam_item_id })))
    ];
  }

  async composeTraceabilityAppendix(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    return [section(reportVersionId, 14, "traceability_appendix", "Traceability Appendix", { sources: this.sourcesFor(report) }, this.sourcesFor(report))];
  }

  async composeEvidenceIndex(reportVersionId: string, context: ReportingContext): Promise<ReportSectionResponse[]> {
    const report = await this.requireReport(reportVersionId, context);
    const findings = report.source_gap_analysis_version_id ? await this.deps.gapAnalysis.repositories.gapFindings.listByVersion(report.source_gap_analysis_version_id, context.organizationId) : [];
    const entries = findings.map((finding) => ({
      evidence_finding_id: finding.evidence_finding_id,
      source_location: finding.soa_item_id,
      snippet: finding.gap_summary.slice(0, 240)
    }));
    return [section(reportVersionId, 15, "evidence_index", "Evidence Index", { entries })];
  }

  private async requireReport(reportVersionId: string, context: ReportingContext) {
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    return report;
  }

  private countBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      const value = String(item[key] ?? "unknown");
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  }

  private sourcesFor(report: ReportVersionResponse) {
    return [
      ...(report.source_soa_version_id ? [{ source_type: "soa_version", source_id: report.source_soa_version_id }] : []),
      ...(report.source_gap_analysis_version_id ? [{ source_type: "gap_analysis_version", source_id: report.source_gap_analysis_version_id }] : []),
      ...(report.source_maturity_assessment_version_id ? [{ source_type: "maturity_assessment_version", source_id: report.source_maturity_assessment_version_id }] : []),
      ...(report.source_poam_version_id ? [{ source_type: "poam_version", source_id: report.source_poam_version_id }] : [])
    ];
  }
}

