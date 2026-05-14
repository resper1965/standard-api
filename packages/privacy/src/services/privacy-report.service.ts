import type { PrivacyDependencies, PrivacyContext } from "../types";
import { PrivacyError } from "../errors";
import { PrivacyCompletenessService } from "./privacy-completeness.service";

// ─── Report Types ───────────────────────────────────────────────────

export type RopaReportFormat = "json" | "markdown";

export type RopaFieldOrigin = "declared" | "ai_suggested" | "ai_approved" | "system_inferred" | "pending" | "evidence_accepted" | "evidence_rejected";

export type RopaReportField = {
  field: string;
  value: unknown;
  origin: RopaFieldOrigin;
  review_status: string | null;
  reviewer_comment: string | null;
};

export type RopaReport = {
  report_id: string;
  generated_at: string;
  format: RopaReportFormat;
  activity_id: string;
  tenant_id: string;
  compliance_assertion: false; // ALWAYS false. System NEVER asserts compliance.
  completeness: {
    score: number;
    can_be_submitted: boolean;
    blocking_issues: number;
  };
  activity: Record<string, RopaReportField>;
  data_subjects: Array<Record<string, unknown>>;
  data_categories: Array<Record<string, unknown>>;
  third_parties: Array<Record<string, unknown>>;
  screenings: Array<Record<string, unknown>>;
  scf_controls: Array<Record<string, unknown>>;
  field_reviews_summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    ai_suggested: number;
  };
  executive_summary: string;
  gaps: string[];
  warnings: string[];
  markdown?: string;
};

// ─── Report Service ─────────────────────────────────────────────────

export class PrivacyReportService {
  private completeness: PrivacyCompletenessService;

  constructor(private readonly deps: PrivacyDependencies) {
    this.completeness = new PrivacyCompletenessService(deps);
  }

  async generateReport(
    activityId: string,
    tenantId: string,
    format: RopaReportFormat = "json"
  ): Promise<RopaReport> {
    const activity = await this.deps.repositories.activities.get(activityId, tenantId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const [subjects, categories, thirdParties, screenings, fieldReviews, scfControls, completenessResult] =
      await Promise.all([
        this.deps.repositories.dataSubjects.listByActivity(activityId, tenantId),
        this.deps.repositories.dataCategories.listByActivity(activityId, tenantId),
        this.deps.repositories.thirdParties.listByActivity(activityId, tenantId),
        this.deps.repositories.screenings.listByActivity(activityId, tenantId),
        this.deps.repositories.fieldReviews.listByActivity(activityId, tenantId),
        this.deps.repositories.scfControls.listByActivity(activityId, tenantId),
        this.completeness.analyze(activityId, tenantId),
      ]);

    // Build field origin map from field reviews
    const reviewMap = new Map<string, { origin: RopaFieldOrigin; status: string; comment: string | null }>();
    for (const r of fieldReviews) {
      const origin: RopaFieldOrigin = r.source === "ai_suggestion"
        ? (r.review_status === "approved" ? "ai_approved" : "ai_suggested")
        : r.source === "system_rule" ? "system_inferred"
        : "declared";
      reviewMap.set(r.field_name, { origin, status: r.review_status, comment: r.comment });
    }

    // Build activity fields with origin tracking
    const activityFields: Record<string, RopaReportField> = {};
    const fieldNames = [
      "name", "description", "purpose", "legal_basis_lgpd", "legal_basis_detail",
      "retention_period", "retention_justification", "controller_role",
      "third_party_sharing", "international_transfer", "automated_decision_making",
      "large_scope_processing", "vulnerable_subjects", "systematic_monitoring",
      "security_measures_summary", "risk_level",
    ];
    for (const field of fieldNames) {
      const review = reviewMap.get(field);
      activityFields[field] = {
        field,
        value: (activity as any)[field],
        origin: review?.origin ?? ((activity as any)[field] != null ? "declared" : "pending"),
        review_status: review?.status ?? null,
        reviewer_comment: review?.comment ?? null,
      };
    }

    // Field reviews summary
    const reviewSummary = {
      total: fieldReviews.length,
      pending: fieldReviews.filter((r) => r.review_status === "pending").length,
      approved: fieldReviews.filter((r) => r.review_status === "approved").length,
      rejected: fieldReviews.filter((r) => r.review_status === "rejected").length,
      ai_suggested: fieldReviews.filter((r) => r.source === "ai_suggestion").length,
    };

    // Generate gaps
    const gaps: string[] = [];
    for (const issue of completenessResult.blocking_issues) {
      gaps.push(`[${issue.severity.toUpperCase()}] ${issue.message}`);
    }
    if (reviewSummary.pending > 0) {
      gaps.push(`${reviewSummary.pending} field reviews pending human approval.`);
    }

    // Generate warnings
    const warnings: string[] = [];
    const requiredScreenings = screenings.filter((s) => s.result === "required");
    for (const s of requiredScreenings) {
      warnings.push(`${s.screening_type.toUpperCase()} required: ${s.recommendation ?? "Review needed."}`);
    }
    if (activity.international_transfer && thirdParties.length === 0) {
      warnings.push("International transfer flagged but no third parties registered.");
    }

    // Executive summary
    const summary = this.generateExecutiveSummary(activity, subjects, categories, thirdParties, completenessResult, screenings, reviewSummary);

    const report: RopaReport = {
      report_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      format,
      activity_id: activityId,
      tenant_id: tenantId,
      compliance_assertion: false,
      completeness: {
        score: completenessResult.completeness_score,
        can_be_submitted: completenessResult.can_be_submitted_for_review,
        blocking_issues: completenessResult.blocking_issues.length,
      },
      activity: activityFields,
      data_subjects: subjects,
      data_categories: categories,
      third_parties: thirdParties,
      screenings,
      scf_controls: scfControls,
      field_reviews_summary: reviewSummary,
      executive_summary: summary,
      gaps,
      warnings,
    };

    if (format === "markdown") {
      report.markdown = this.renderMarkdown(report);
    }

    return report;
  }

  private generateExecutiveSummary(
    activity: any, subjects: any[], categories: any[],
    thirdParties: any[], completeness: any, screenings: any[], reviews: any
  ): string {
    const lines: string[] = [];
    lines.push(`## ROPA — ${activity.name}`);
    lines.push("");
    lines.push(`**Status:** ${activity.status}`);
    lines.push(`**Completeness:** ${completeness.completeness_score}%`);
    lines.push(`**Controller Role:** ${activity.controller_role}`);
    lines.push("");
    lines.push(`### Data Processing`);
    lines.push(`- **Purpose:** ${activity.purpose ?? "Not declared"}`);
    lines.push(`- **Legal Basis (LGPD):** ${activity.legal_basis_lgpd ?? "Not declared"}`);
    lines.push(`- **Retention:** ${activity.retention_period ?? "Not declared"}`);
    lines.push(`- **Data Subjects:** ${subjects.length > 0 ? subjects.map((s: any) => s.category).join(", ") : "None registered"}`);
    lines.push(`- **Data Categories:** ${categories.length > 0 ? categories.map((c: any) => c.category_name).join(", ") : "None registered"}`);
    lines.push(`- **Third Parties:** ${thirdParties.length > 0 ? thirdParties.map((t: any) => t.name).join(", ") : "None registered"}`);
    lines.push("");
    lines.push(`### Risk Indicators`);
    lines.push(`- International Transfer: ${activity.international_transfer ? "Yes" : "No"}`);
    lines.push(`- Automated Decision Making: ${activity.automated_decision_making ? "Yes" : "No"}`);
    lines.push(`- Vulnerable Subjects: ${activity.vulnerable_subjects ? "Yes" : "No"}`);
    lines.push(`- Systematic Monitoring: ${activity.systematic_monitoring ? "Yes" : "No"}`);
    lines.push("");
    const requiredScreenings = screenings.filter((s: any) => s.result === "required");
    if (requiredScreenings.length > 0) {
      lines.push(`### Required Assessments`);
      for (const s of requiredScreenings) {
        lines.push(`- **${s.screening_type.toUpperCase()}:** ${s.recommendation}`);
      }
      lines.push("");
    }
    lines.push(`### Review Status`);
    lines.push(`- Total reviews: ${reviews.total}`);
    lines.push(`- Pending: ${reviews.pending}`);
    lines.push(`- AI suggestions: ${reviews.ai_suggested}`);
    lines.push("");
    lines.push(`> ⚠️ This report does NOT assert compliance. All data must be reviewed and approved by a qualified human (DPO or equivalent).`);

    return lines.join("\n");
  }

  private renderMarkdown(report: RopaReport): string {
    const lines: string[] = [];
    lines.push("# ROPA — Record of Processing Activities");
    lines.push(`Generated: ${report.generated_at}`);
    lines.push(`Report ID: ${report.report_id}`);
    lines.push("");
    lines.push(report.executive_summary);
    lines.push("");
    lines.push("---");
    lines.push("");

    // Evidence Matrix
    lines.push("## Evidence Matrix");
    lines.push("");
    lines.push("| Field | Value | Origin | Review Status |");
    lines.push("|-------|-------|--------|---------------|");
    for (const [_, field] of Object.entries(report.activity)) {
      const val = field.value != null ? String(field.value).substring(0, 50) : "—";
      lines.push(`| ${field.field} | ${val} | ${field.origin} | ${field.review_status ?? "—"} |`);
    }
    lines.push("");

    // Gaps
    if (report.gaps.length > 0) {
      lines.push("## Gap Report");
      lines.push("");
      for (const gap of report.gaps) {
        lines.push(`- ${gap}`);
      }
      lines.push("");
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push("## Warnings");
      lines.push("");
      for (const w of report.warnings) {
        lines.push(`- ⚠️ ${w}`);
      }
      lines.push("");
    }

    // Third Parties
    if (report.third_parties.length > 0) {
      lines.push("## Third Parties");
      lines.push("");
      lines.push("| Name | Role | Country | Transfer Mechanism |");
      lines.push("|------|------|---------|-------------------|");
      for (const tp of report.third_parties) {
        lines.push(`| ${(tp as any).name} | ${(tp as any).role} | ${(tp as any).country ?? "—"} | ${(tp as any).transfer_mechanism ?? "—"} |`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("> **Disclaimer:** This document was generated automatically and does NOT constitute a compliance assessment. All information must be validated by the organization's DPO.");

    return lines.join("\n");
  }
}
