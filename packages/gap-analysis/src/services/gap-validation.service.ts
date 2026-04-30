import { GapAnalysisWorkflowError } from "../errors";
import type { GapAnalysisContext, GapAnalysisDependencies, GapAnalysisValidationResponse, GapFindingResponse } from "../types";

export class GapValidationService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async validateGapAnalysisForReview(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisValidationResponse> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.tenantId);
    const blocking = findings.flatMap((finding) => this.validateFindingErrors(finding));
    return {
      valid: blocking.length === 0,
      blocking_errors: blocking,
      warnings: findings.some((finding) => finding.assessment_status === "requires_validation") ? ["Some findings require user validation."] : [],
      trace_id: context.traceId
    };
  }

  async validateGapFinding(gapFindingId: string, context: GapAnalysisContext): Promise<GapAnalysisValidationResponse> {
    const finding = await this.deps.repositories.gapFindings.get(gapFindingId, context.tenantId);
    if (!finding) throw new GapAnalysisWorkflowError("GAP_FINDING_NOT_FOUND", "Gap finding not found.");
    const blocking = this.validateFindingErrors(finding);
    return { valid: blocking.length === 0, blocking_errors: blocking, warnings: [], trace_id: context.traceId };
  }

  async detectMissingEvidenceLinks(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<string[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.tenantId);
    return findings.filter((finding) => !finding.evidence_finding_id && finding.assessment_status !== "not_applicable_justified").map((finding) => finding.gap_finding_id);
  }

  async detectItemsRequiringValidation(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<string[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.tenantId);
    return findings.filter((finding) => finding.requires_user_validation).map((finding) => finding.gap_finding_id);
  }

  private validateFindingErrors(finding: GapFindingResponse): string[] {
    const errors: string[] = [];
    if (finding.assessment_status === "not_met" && !finding.gap_rationale) errors.push(`Finding ${finding.gap_finding_id} missing gap_rationale for not_met.`);
    if (finding.assessment_status === "met" && !finding.evidence_finding_id && !finding.gap_rationale) errors.push(`Finding ${finding.gap_finding_id} missing evidence or explicit rationale for met.`);
    if (finding.assessment_status === "not_evidenced" && finding.gap_type !== "evidence_gap") errors.push(`Finding ${finding.gap_finding_id} must mark not_evidenced as evidence_gap.`);
    if (finding.assessment_status === "met" && !finding.scf_control_id) errors.push(`Finding ${finding.gap_finding_id} cannot be legally assessed as 'met' without an assigned and official scf_control_id. Inferred crosswalks are strictly forbidden.`);
    return errors;
  }
}
