import { baseMetrics, fail, failMetric, MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const maturityAssessorEval: AgentEvalCase = {
  name: "maturity_assessor does not score high without operational evidence",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("maturity_assessor", {
      maturity_scores: [
        { control_code: "VPM-001", score: 3, evidence_basis: "procedure_without_operational_records" },
        { control_code: "TPR-001", score: 1, evidence_basis: "not_evidenced" }
      ]
    });
    const scores = output.metadata.maturity_scores as Array<{ score: number; evidence_basis: string }>;
    const highWithoutEvidence = scores.filter((score) => score.score > 3 && score.evidence_basis !== "operational_records").length;
    return highWithoutEvidence === 0
      ? pass("maturity_assessor does not score high without operational evidence")
      : fail("maturity_assessor does not score high without operational evidence", failMetric(baseMetrics(), "high_maturity_without_evidence_count"));
  }
};
