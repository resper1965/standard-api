import type { GapFindingResponse, MaturityScoreReference, PoamActionType, PoamEffortEstimate, PoamPriority, PoamSeverity, ScfControl } from "../types";

export class PoamPrioritizationService {
  determineActionType(gapFinding: GapFindingResponse): PoamActionType {
    if (gapFinding.assessment_status === "requires_validation" || gapFinding.assessment_status === "not_applicable_not_justified") return "validation_required";
    if (gapFinding.assessment_status === "not_evidenced") return "evidence_collection";
    switch (gapFinding.gap_type) {
      case "documentation_gap":
        return "policy_update";
      case "evidence_gap":
        return "evidence_collection";
      case "implementation_gap":
      case "technical_gap":
        return "technical_implementation";
      case "effectiveness_gap":
      case "monitoring_gap":
        return "monitoring_improvement";
      case "governance_gap":
        return "governance_improvement";
      case "contractual_gap":
        return "third_party_action";
      default:
        return "validation_required";
    }
  }

  calculatePriority(gapFinding: GapFindingResponse, maturityScore?: MaturityScoreReference | null, scfControl?: ScfControl | null): PoamPriority {
    let score = 0;
    score += this.severityWeight(gapFinding.severity);
    if (["implementation_gap", "effectiveness_gap", "monitoring_gap", "governance_gap"].includes(gapFinding.gap_type)) score += 1;
    if (gapFinding.confidence_score < 0.5) score += 1;
    if (maturityScore && maturityScore.score <= 1) score += 2;
    if (maturityScore && maturityScore.score === 2) score += 1;
    if (scfControl?.control_description?.toLowerCase().includes("critical")) score += 1;
    if (score >= 5) return "urgent";
    if (score >= 3) return "high";
    if (score >= 1) return "medium";
    return "low";
  }

  calculateRiskRating(gapFinding: GapFindingResponse, maturityScore?: MaturityScoreReference | null): string {
    const maturityText = maturityScore ? `maturity ${maturityScore.score}` : "maturity not available";
    return `${gapFinding.severity} severity / ${gapFinding.gap_type} / ${maturityText}`;
  }

  suggestEffort(gapFinding: GapFindingResponse, actionType: PoamActionType): PoamEffortEstimate {
    if (actionType === "evidence_collection" || actionType === "validation_required") return "small";
    if (actionType === "policy_update" || actionType === "procedure_creation" || actionType === "training") return "medium";
    if (gapFinding.severity === "critical" || actionType === "technical_implementation") return "large";
    if (actionType === "third_party_action") return "unknown";
    return "medium";
  }

  normalizeSeverity(severity: GapFindingResponse["severity"]): PoamSeverity {
    return severity;
  }

  private severityWeight(severity: GapFindingResponse["severity"]): number {
    if (severity === "critical") return 4;
    if (severity === "high") return 3;
    if (severity === "medium") return 1;
    return 0;
  }
}
