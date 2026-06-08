import type { MaturityClassificationInput, MaturityLevel } from "../types";

type ClassificationResult = {
  score: MaturityLevel;
  rationale: string;
  confidenceScore: number;
};

/**
 * Rule-based maturity classification engine (CMMI-inspired).
 *
 * This is the deterministic classifier. An LLM-assisted classifier can wrap
 * this and refine scores based on richer evidence context, but the base rules
 * guarantee a consistent, auditable floor.
 *
 * Maturity levels:
 * 0 - Incomplete: not implemented / not evidenced
 * 1 - Initial: ad-hoc, evidence is weak
 * 2 - Managed: basic process, partial evidence
 * 3 - Defined: documented process, strong evidence
 * 4 - Quantitatively Managed: measured performance
 * 5 - Optimizing: continuous improvement
 */
export const classifyMaturity = (
  input: MaturityClassificationInput,
): ClassificationResult => {
  // Gap not met or not evidenced → Level 0
  if (input.gapStatus === "not_met" || input.gapStatus === "not_evidenced") {
    return {
      score: 0,
      rationale: `Control ${input.controlCode} is not met (gap status: ${input.gapStatus}). No maturity applies.`,
      confidenceScore: 0.95,
    };
  }

  // Not applicable → Level 0 with high confidence
  if (
    input.gapStatus === "not_applicable_justified" ||
    input.gapStatus === "not_applicable_not_justified"
  ) {
    return {
      score: 0,
      rationale: `Control ${input.controlCode} is not applicable (${input.gapStatus}).`,
      confidenceScore: 1.0,
    };
  }

  // Requires validation → Level 1 with low confidence
  if (input.gapStatus === "requires_validation") {
    return {
      score: 1,
      rationale: `Control ${input.controlCode} requires human validation. Assigned initial maturity pending review.`,
      confidenceScore: 0.3,
    };
  }

  // From here: met or partially_met
  const hasEvidence =
    input.evidenceStrength === "strong" || input.evidenceStrength === "partial";
  const isPartial = input.gapStatus === "partially_met";

  let score: MaturityLevel = 1;
  let rationale: string;
  let confidenceScore: number;

  // Partially met with weak/absent evidence → Level 1
  if (isPartial && !hasEvidence) {
    score = 1;
    rationale = `Control ${input.controlCode} is partially met with ${input.evidenceStrength ?? "unknown"} evidence. Ad-hoc implementation.`;
    confidenceScore = 0.6;
  }
  // Partially met with some evidence → Level 2
  else if (isPartial && hasEvidence) {
    score = 2;
    rationale = `Control ${input.controlCode} is partially met with ${input.evidenceStrength} evidence (coverage: ${(input.evidenceCoverage * 100).toFixed(0)}%). Basic process in place.`;
    confidenceScore = 0.7;
  }
  // Met — determine level based on maturity indicators
  else if (
    input.hasDocumentation &&
    input.hasProcess &&
    input.evidenceStrength === "strong"
  ) {
    // Level 5: documented + process + measurement + continuous improvement
    if (input.hasMeasurement && input.hasContinuousImprovement) {
      score = 5;
      rationale = `Control ${input.controlCode} is fully met with documented process, measurement, and continuous improvement. Optimizing maturity.`;
      confidenceScore = 0.85;
    }
    // Level 4: documented + process + measurement
    else if (input.hasMeasurement) {
      score = 4;
      rationale = `Control ${input.controlCode} is fully met with documented process and quantitative measurement. Quantitatively managed.`;
      confidenceScore = 0.8;
    }
    // Level 3: documented + process
    else {
      score = 3;
      rationale = `Control ${input.controlCode} is fully met with standardized, documented process and strong evidence (coverage: ${(input.evidenceCoverage * 100).toFixed(0)}%).`;
      confidenceScore = 0.8;
    }
  }
  // Met with partial evidence → Level 2
  else if (hasEvidence) {
    score = 2;
    rationale = `Control ${input.controlCode} is met with ${input.evidenceStrength} evidence but lacks full documentation or standardized process.`;
    confidenceScore = 0.65;
  }
  // Met with weak evidence → Level 1
  else {
    score = 1;
    rationale = `Control ${input.controlCode} is met but evidence is ${input.evidenceStrength ?? "absent"}. Ad-hoc implementation.`;
    confidenceScore = 0.5;
  }

  // Enrich with official rubrics if available
  if (input.rubrics && input.rubrics.length > 0) {
    const rubric = input.rubrics.find((r) => r.level === score);
    if (rubric) {
      rationale += ` Official SCF Criteria: "${rubric.criteriaText}".`;
      if (rubric.remediationGuidance) {
        rationale += ` Guidance: ${rubric.remediationGuidance}`;
      }
    }
  }

  return {
    score,
    rationale,
    confidenceScore,
  };
};
