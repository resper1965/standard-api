// @ts-nocheck -- Zod v4 CI type compat
/**
 * SCR-RMM Step 12: Risk Score Engine
 *
 * Calculates Inherent Risk (IE Ã— OL) and Residual Risk (post-control mitigation).
 *
 * References:
 *   SCR-RMM v2026.1 â€” Steps 12A (Impact Effect) and 12B (Occurrence Likelihood)
 *   Appendix A: Calculating Inherent Risk vs Residual Risk
 *
 * AGENTS.md Â§8: This is a PURE function â€” no LLM inference, no stored mappings.
 * Risk scoring is deterministic math, not AI inference.
 */

// â”€â”€ Impact Effect (IE) Scale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SCR-RMM Impact Effect categories (6-point scale).
 * Maps severity labels to numeric values for matrix calculation.
 */
export const IMPACT_EFFECT_VALUES = {
  insignificant: 1, // Little-to-no impact to business operations
  minor: 2, // Minor impacts to business operations
  moderate: 3, // Moderate impacts to business operations
  major: 4, // Major impacts to business operations
  critical: 5, // Critical impacts to business operations
  catastrophic: 6, // Catastrophic impacts to business operations
} as const;

export type ImpactEffect = keyof typeof IMPACT_EFFECT_VALUES;

// â”€â”€ Occurrence Likelihood (OL) Scale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SCR-RMM Occurrence Likelihood categories (6-point scale).
 */
export const OCCURRENCE_LIKELIHOOD_VALUES = {
  remote: 1, // <1% chance of occurrence
  highly_unlikely: 2, // 1-10% chance of occurrence
  unlikely: 3, // 10-25% chance of occurrence
  possible: 4, // 25-70% chance of occurrence
  likely: 5, // 70-99% chance of occurrence
  almost_certain: 6, // >99% chance of occurrence
} as const;

export type OccurrenceLikelihood = keyof typeof OCCURRENCE_LIKELIHOOD_VALUES;

// â”€â”€ Risk Category Thresholds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SCR-RMM 5-category risk scale derived from IE Ã— OL matrix (max score: 36).
 * Thresholds follow the standard SCR-RMM qualification matrix.
 */
export type RiskCategory = "low" | "moderate" | "high" | "severe" | "extreme";

export function categorizeRisk(score: number): RiskCategory {
  if (score <= 4) return "low";
  if (score <= 9) return "moderate";
  if (score <= 16) return "high";
  if (score <= 25) return "severe";
  return "extreme";
}

// â”€â”€ ROC Determination Derivation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SCR-RMM Step 14: Derive Report on Conformity (ROC) determination
 * from a gap finding's severity and assessment_status.
 *
 * Rules (deterministic â€” human reviewer may override before approval):
 *   - severity=critical OR severity=high AND not_met â†’ material_weakness
 *   - severity=medium AND not_met/partially_met â†’ significant_deficiency
 *   - severity=low AND not_met â†’ conforms
 *   - assessment_status=met OR no_gap â†’ strictly_conforms
 *   - not_applicable â†’ not mapped (returns null)
 */
export type RocDetermination =
  | "strictly_conforms"
  | "conforms"
  | "significant_deficiency"
  | "material_weakness";

export function deriveRocDetermination(
  severity: "informational" | "low" | "medium" | "high" | "critical",
  assessmentStatus:
    | "met"
    | "partially_met"
    | "not_met"
    | "not_evidenced"
    | "not_applicable_justified"
    | "not_applicable_not_justified"
    | "requires_validation",
  gapType?: string,
): RocDetermination | null {
  // Not applicable findings are excluded from ROC
  if (
    assessmentStatus === "not_applicable_justified" ||
    assessmentStatus === "not_applicable_not_justified"
  ) {
    return null;
  }

  // Met with no_gap â†’ positive assurance (best outcome)
  if (assessmentStatus === "met" && gapType === "no_gap") {
    return "strictly_conforms";
  }

  // Met but no explicit no_gap â†’ still conforms
  if (assessmentStatus === "met") {
    return "conforms";
  }

  // Critical or High + not met â†’ material weakness (must go to POA&M)
  if (
    (severity === "critical" || severity === "high") &&
    (assessmentStatus === "not_met" || assessmentStatus === "not_evidenced")
  ) {
    return "material_weakness";
  }

  // High + partially met â†’ significant deficiency
  if (
    severity === "high" &&
    (assessmentStatus === "partially_met" ||
      assessmentStatus === "requires_validation")
  ) {
    return "significant_deficiency";
  }

  // Medium + any non-met â†’ significant deficiency
  if (severity === "medium") {
    if (
      assessmentStatus === "not_met" ||
      assessmentStatus === "partially_met" ||
      assessmentStatus === "not_evidenced" ||
      assessmentStatus === "requires_validation"
    ) {
      return "significant_deficiency";
    }
  }

  // Low + not met â†’ conforms (within acceptable bounds)
  if (severity === "low" || severity === "informational") {
    return "conforms";
  }

  // Default: conforms (conservative â€” do not escalate without evidence)
  return "conforms";
}

// â”€â”€ Risk Score Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type RiskScoreInput = {
  /** SCR-RMM IE value 1-6, or use IMPACT_EFFECT_VALUES[label] */
  impactValue: number;
  /** SCR-RMM OL value 1-6, or use OCCURRENCE_LIKELIHOOD_VALUES[label] */
  likelihoodValue: number;
  /**
   * Control weight factor (0-1). From scf_controls.control_weight.
   * Reflects the effectiveness of the control if fully implemented.
   */
  controlWeight?: number;
  /**
   * Maturity level of the control (0-5, from SCR-CMM).
   * 0=Incomplete, 5=Optimizing. Used to discount control weight.
   */
  maturityLevel?: number;
};

export type RiskScoreResult = {
  /** Inherent risk = IE Ã— OL. Range: 1-36. */
  inherentRisk: number;
  /** Residual risk = Inherent Ã— (1 - clamp(controlWeight Ã— maturityFactor, 0, 0.9)). */
  residualRisk: number;
  /** Risk category derived from residual risk score. */
  riskCategory: RiskCategory;
  /** ROC-compatible impact factor used (1-6). */
  impactValue: number;
  /** ROC-compatible likelihood factor used (1-6). */
  likelihoodValue: number;
  /** Mitigation factor applied (0-0.9). */
  mitigationFactor: number;
};

/**
 * SCR-RMM Appendix A: Calculate Inherent and Residual Risk.
 *
 * Step 1: Inherent Risk = IE Ã— OL
 * Step 2: Account for Control Weighting (0-1)
 * Step 3: Account for Maturity Level (0-5 â†’ factor 0-1)
 * Step 4: Residual Risk = Inherent Ã— (1 - mitigationFactor)
 *         where mitigationFactor = clamp(controlWeight Ã— (maturityLevel/5), 0, 0.9)
 *         â€” capped at 0.9 because no control is perfect (NIST principle of defense in depth)
 */
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const {
    impactValue,
    likelihoodValue,
    controlWeight = 0,
    maturityLevel = 0,
  } = input;

  // Validate ranges
  const ie = Math.max(1, Math.min(6, impactValue));
  const ol = Math.max(1, Math.min(6, likelihoodValue));
  const cw = Math.max(0, Math.min(1, controlWeight));
  const ml = Math.max(0, Math.min(5, maturityLevel));

  // Step 1: Inherent risk
  const inherentRisk = ie * ol;

  // Step 3: Maturity factor (0 at level 0, 1.0 at level 5)
  const maturityFactor = ml / 5;

  // Step 2+3+4: Combined mitigation â€” capped at 0.9 (10% floor risk always remains)
  const mitigationFactor = Math.min(0.9, cw * maturityFactor);

  // Step 4: Residual risk
  const residualRisk = Number(
    (inherentRisk * (1 - mitigationFactor)).toFixed(2),
  );

  return {
    inherentRisk,
    residualRisk,
    riskCategory: categorizeRisk(residualRisk),
    impactValue: ie,
    likelihoodValue: ol,
    mitigationFactor: Number(mitigationFactor.toFixed(3)),
  };
}

/**
 * Convenience: Map gap finding severity to a default IE value.
 * Used when no explicit IE value is provided.
 */
export function severityToImpactEffect(
  severity: "informational" | "low" | "medium" | "high" | "critical",
): number {
  const map: Record<string, number> = {
    informational: 1,
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  };
  return map[severity] ?? 3;
}

/**
 * Convenience: Map gap finding likelihood string to OL value.
 * The gap finding stores likelihood as text (e.g. "likely", "possible").
 */
export function likelihoodToOccurrenceLikelihood(likelihood?: string): number {
  if (!likelihood) return 3; // Default: unlikely (conservative)
  const map: Record<string, number> = {
    remote: 1,
    highly_unlikely: 2,
    unlikely: 3,
    possible: 4,
    likely: 5,
    almost_certain: 6,
    // Legacy mappings
    low: 2,
    medium: 3,
    high: 4,
  };
  return map[likelihood.toLowerCase()] ?? 3;
}

