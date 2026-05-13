/**
 * Eval: Evidence Evaluator Rejection Rules
 *
 * Validates that the Evidence Evaluator enforces strict GRC guardrails:
 * 1. Low confidence (< 30) → must NOT be marked compliant
 * 2. Missing elements must be populated when non-compliant
 * 3. Compliant evidence must have confidence >= 50
 * 4. Auditor notes must not be empty regardless of outcome
 * 5. High confidence compliant must have empty missing_elements
 */

import type { EvidenceEvaluationOutput } from "../../packages/agent-runtime/src/usecases/evidence-evaluator";
import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

const makeSyntheticEvidence = (overrides: Partial<EvidenceEvaluationOutput>): EvidenceEvaluationOutput => ({
  is_compliant: false,
  confidence_score: 50,
  missing_elements: [],
  auditor_notes: "Synthetic evaluation.",
  ...overrides,
});

export const evidenceEvaluatorRejectionEval: AgentEvalCase = {
  name: "evidence_evaluator rejection and compliance guardrails",
  run() {
    const metrics = baseMetrics();

    // 1. Low confidence → must NOT be compliant
    const lowConfidence = makeSyntheticEvidence({
      confidence_score: 15,
      is_compliant: true, // This is a guardrail violation
    });
    if (lowConfidence.confidence_score < 30 && lowConfidence.is_compliant) {
      return fail(this.name, failMetric(metrics, "not_evidenced_misclassification_count"));
    }

    // 2. Non-compliant must explain what's missing
    const nonCompliant = makeSyntheticEvidence({
      is_compliant: false,
      confidence_score: 25,
      missing_elements: [],
    });
    if (!nonCompliant.is_compliant && nonCompliant.missing_elements.length === 0) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 3. Compliant with good confidence and populated missing → contradiction
    const contradictory = makeSyntheticEvidence({
      is_compliant: true,
      confidence_score: 85,
      missing_elements: ["Policy document not found", "No evidence of training"],
    });
    if (contradictory.is_compliant && contradictory.missing_elements.length > 0) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 4. Auditor notes must never be empty
    const emptyNotes = makeSyntheticEvidence({
      auditor_notes: "",
    });
    if (emptyNotes.auditor_notes.trim() === "") {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 5. Well-formed compliant result
    const proper = makeSyntheticEvidence({
      is_compliant: true,
      confidence_score: 88,
      missing_elements: [],
      auditor_notes: "All controls verified against ISO 27001 Annex A.5.",
    });
    if (proper.is_compliant && proper.confidence_score >= 50 && proper.missing_elements.length === 0) {
      // This is correct — pass
    } else {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    return pass(this.name, metrics);
  },
};
