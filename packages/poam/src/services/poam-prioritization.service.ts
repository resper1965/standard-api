import type { GapFindingResponse, MaturityScoreReference, PoamActionType, PoamEffortEstimate, PoamPriority, PoamSeverity, ScfControl } from "../types";

// --- Pure scoring functions ---

/** Maps severity to a numeric weight for priority scoring. */
function severityWeight(severity: GapFindingResponse["severity"]): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 1;
  return 0;
}

/** Adds weight for high-impact gap types. */
function gapTypeWeight(gapType: GapFindingResponse["gap_type"]): number {
  const highImpactGapTypes: GapFindingResponse["gap_type"][] = ["implementation_gap", "effectiveness_gap", "monitoring_gap", "governance_gap"];
  return highImpactGapTypes.includes(gapType) ? 1 : 0;
}

/** Adds weight when agent confidence is low. */
function confidenceWeight(confidenceScore: number): number {
  return confidenceScore < 0.5 ? 1 : 0;
}

/** Adds weight based on maturity score level. */
function maturityWeight(maturityScore?: MaturityScoreReference | null): number {
  if (maturityScore && maturityScore.score <= 1) return 2;
  if (maturityScore && maturityScore.score === 2) return 1;
  return 0;
}

/** Adds weight when the SCF control description mentions "critical". */
function controlCriticalityWeight(scfControl?: ScfControl | null): number {
  return scfControl?.control_description?.toLowerCase().includes("critical") ? 1 : 0;
}

/** Computes a composite risk score from all weighted factors. */
function calculateRiskScore(
  gapFinding: GapFindingResponse,
  maturityScore?: MaturityScoreReference | null,
  scfControl?: ScfControl | null
): number {
  return (
    severityWeight(gapFinding.severity) +
    gapTypeWeight(gapFinding.gap_type) +
    confidenceWeight(gapFinding.confidence_score) +
    maturityWeight(maturityScore) +
    controlCriticalityWeight(scfControl)
  );
}

/** Maps a numeric risk score to a priority level. */
function determinePriorityLevel(score: number): PoamPriority {
  if (score >= 5) return "urgent";
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

// --- Declarative action-type mapping ---

const GAP_TYPE_TO_ACTION: Record<string, PoamActionType> = {
  documentation_gap: "policy_update",
  evidence_gap: "evidence_collection",
  implementation_gap: "technical_implementation",
  technical_gap: "technical_implementation",
  effectiveness_gap: "monitoring_improvement",
  monitoring_gap: "monitoring_improvement",
  governance_gap: "governance_improvement",
  contractual_gap: "third_party_action",
};

/** Resolves action type from assessment status early-exits, then falls back to gap type lookup. */
function resolveActionType(gapFinding: GapFindingResponse): PoamActionType {
  if (gapFinding.assessment_status === "requires_validation" || gapFinding.assessment_status === "not_applicable_not_justified") return "validation_required";
  if (gapFinding.assessment_status === "not_evidenced") return "evidence_collection";
  return GAP_TYPE_TO_ACTION[gapFinding.gap_type] ?? "validation_required";
}

// --- Effort estimation helpers ---

const SMALL_EFFORT_ACTIONS: PoamActionType[] = ["evidence_collection", "validation_required"];
const MEDIUM_EFFORT_ACTIONS: PoamActionType[] = ["policy_update", "procedure_creation", "training"];

function resolveEffort(gapFinding: GapFindingResponse, actionType: PoamActionType): PoamEffortEstimate {
  if (SMALL_EFFORT_ACTIONS.includes(actionType)) return "small";
  if (MEDIUM_EFFORT_ACTIONS.includes(actionType)) return "medium";
  if (gapFinding.severity === "critical" || actionType === "technical_implementation") return "large";
  if (actionType === "third_party_action") return "unknown";
  return "medium";
}

// --- Service class (delegates to pure functions) ---

export class PoamPrioritizationService {
  determineActionType(gapFinding: GapFindingResponse): PoamActionType {
    return resolveActionType(gapFinding);
  }

  calculatePriority(gapFinding: GapFindingResponse, maturityScore?: MaturityScoreReference | null, scfControl?: ScfControl | null): PoamPriority {
    const score = calculateRiskScore(gapFinding, maturityScore, scfControl);
    return determinePriorityLevel(score);
  }

  calculateRiskRating(gapFinding: GapFindingResponse, maturityScore?: MaturityScoreReference | null): string {
    const maturityText = maturityScore ? `maturity ${maturityScore.score}` : "maturity not available";
    return `${gapFinding.severity} severity / ${gapFinding.gap_type} / ${maturityText}`;
  }

  suggestEffort(gapFinding: GapFindingResponse, actionType: PoamActionType): PoamEffortEstimate {
    return resolveEffort(gapFinding, actionType);
  }

  normalizeSeverity(severity: GapFindingResponse["severity"]): PoamSeverity {
    return severity;
  }
}
