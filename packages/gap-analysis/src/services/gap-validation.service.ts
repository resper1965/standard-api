import { GapAnalysisWorkflowError } from "../errors";
import type { GapAnalysisContext, GapAnalysisDependencies, GapAnalysisValidationResponse, GapFindingResponse } from "../types";

// ─── Validation Rule Pattern ─────────────────────────────────────────
// Each rule is a pure predicate + error message factory.
// Rules are composed declaratively; adding a new rule requires no
// changes to the validation loop itself.

type FindingValidationRule = {
  readonly matches: (finding: GapFindingResponse) => boolean;
  readonly error: (finding: GapFindingResponse) => string;
};

const notMetRequiresRationale: FindingValidationRule = {
  matches: (f) => f.assessment_status === "not_met" && !f.gap_rationale,
  error: (f) => `Finding ${f.gap_finding_id} missing gap_rationale for not_met.`
};

const metRequiresEvidenceOrRationale: FindingValidationRule = {
  matches: (f) => f.assessment_status === "met" && !f.evidence_finding_id && !f.gap_rationale,
  error: (f) => `Finding ${f.gap_finding_id} missing evidence or explicit rationale for met.`
};

const notEvidencedMustBeEvidenceGap: FindingValidationRule = {
  matches: (f) => f.assessment_status === "not_evidenced" && f.gap_type !== "evidence_gap",
  error: (f) => `Finding ${f.gap_finding_id} must mark not_evidenced as evidence_gap.`
};

const metRequiresOfficialScfControl: FindingValidationRule = {
  matches: (f) => f.assessment_status === "met" && !f.scf_control_id,
  error: (f) =>
    `Finding ${f.gap_finding_id} cannot be legally assessed as 'met' without an assigned and official scf_control_id. Inferred crosswalks are strictly forbidden.`
};

const FINDING_VALIDATION_RULES: readonly FindingValidationRule[] = [
  notMetRequiresRationale,
  metRequiresEvidenceOrRationale,
  notEvidencedMustBeEvidenceGap,
  metRequiresOfficialScfControl
] as const;

// ─── Service ─────────────────────────────────────────────────────────

export class GapValidationService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async validateGapAnalysisForReview(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisValidationResponse> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.organizationId);
    const blocking = findings.flatMap((finding) => this.validateFindingErrors(finding));
    return {
      valid: blocking.length === 0,
      blocking_errors: blocking,
      warnings: findings.some((finding) => finding.assessment_status === "requires_validation") ? ["Some findings require user validation."] : [],
      trace_id: context.traceId
    };
  }

  async validateGapFinding(gapFindingId: string, context: GapAnalysisContext): Promise<GapAnalysisValidationResponse> {
    const finding = await this.deps.repositories.gapFindings.get(gapFindingId, context.organizationId);
    if (!finding) throw new GapAnalysisWorkflowError("GAP_FINDING_NOT_FOUND", "Gap finding not found.");
    const blocking = this.validateFindingErrors(finding);
    return { valid: blocking.length === 0, blocking_errors: blocking, warnings: [], trace_id: context.traceId };
  }

  async detectMissingEvidenceLinks(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<string[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.organizationId);
    return findings.filter((finding) => !finding.evidence_finding_id && finding.assessment_status !== "not_applicable_justified").map((finding) => finding.gap_finding_id);
  }

  async detectItemsRequiringValidation(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<string[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.organizationId);
    return findings.filter((finding) => finding.requires_user_validation).map((finding) => finding.gap_finding_id);
  }

  private validateFindingErrors(finding: GapFindingResponse): string[] {
    return FINDING_VALIDATION_RULES
      .filter((rule) => rule.matches(finding))
      .map((rule) => rule.error(finding));
  }
}

