/**
 * Eval: CMMI Maturity Classification Rules
 *
 * Validates deterministic CMMI classification rules:
 * 1. No evidence → score 0 (Incomplete)
 * 2. Documentation only → max score 2 (Managed)
 * 3. Process but no measurement → max score 3 (Defined)
 * 4. Measurement → score 4 (Quantitatively Managed)
 * 5. Continuous improvement + measurement → score 5 (Optimizing)
 * 6. Gap status "not_applicable" → score N/A (0)
 */

import { classifyMaturity } from "../../packages/maturity/src/services/maturity-classification.service";
import type { MaturityClassificationInput } from "../../packages/maturity/src/types";
import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

const makeInput = (overrides: Partial<MaturityClassificationInput>): MaturityClassificationInput => ({
  scfControlId: "ctrl-001",
  controlCode: "GOV-01",
  controlTitle: "Governance Program",
  gapStatus: "met",
  evidenceStrength: "strong",
  evidenceCoverage: 0.9,
  hasDocumentation: false,
  hasProcess: false,
  hasMeasurement: false,
  hasContinuousImprovement: false,
  ...overrides,
});

export const maturityClassificationEval: AgentEvalCase = {
  name: "maturity_classification CMMI rules produce deterministic scores",
  run() {
    const metrics = baseMetrics();

    // 1. No evidence → Incomplete (0)
    const noEvidence = classifyMaturity(makeInput({
      evidenceStrength: "absent",
      evidenceCoverage: 0,
      gapStatus: "not_evidenced",
    }));
    if (noEvidence.score !== 0) {
      return fail(this.name, failMetric(metrics, "high_maturity_without_evidence_count"));
    }

    // 2. Documentation only, no process → Managed (max 2)
    const docOnly = classifyMaturity(makeInput({
      hasDocumentation: true,
      hasProcess: false,
      evidenceCoverage: 0.5,
    }));
    if (docOnly.score > 2) {
      return fail(this.name, failMetric(metrics, "high_maturity_without_evidence_count"));
    }

    // 3. Documentation + process, no measurement → Defined (max 3)
    const withProcess = classifyMaturity(makeInput({
      hasDocumentation: true,
      hasProcess: true,
      hasMeasurement: false,
      evidenceCoverage: 0.7,
    }));
    if (withProcess.score > 3) {
      return fail(this.name, failMetric(metrics, "high_maturity_without_evidence_count"));
    }

    // 4. Doc + process + measurement → Quantitatively Managed (4)
    const withMeasurement = classifyMaturity(makeInput({
      hasDocumentation: true,
      hasProcess: true,
      hasMeasurement: true,
      hasContinuousImprovement: false,
      evidenceCoverage: 0.85,
    }));
    if (withMeasurement.score < 3 || withMeasurement.score > 4) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 5. Full maturity → Optimizing (5)
    const optimizing = classifyMaturity(makeInput({
      hasDocumentation: true,
      hasProcess: true,
      hasMeasurement: true,
      hasContinuousImprovement: true,
      evidenceCoverage: 0.95,
      evidenceStrength: "strong",
    }));
    if (optimizing.score < 4) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 6. Not applicable gap → 0
    const notApplicable = classifyMaturity(makeInput({
      gapStatus: "not_applicable_justified",
    }));
    if (notApplicable.score !== 0) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    return pass(this.name, metrics);
  },
};
