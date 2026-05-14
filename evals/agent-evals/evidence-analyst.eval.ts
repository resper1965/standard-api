import { baseMetrics, fail, failMetric, MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const evidenceAnalystEval: AgentEvalCase = {
  name: "evidence_analyst preserves not_evidenced semantics",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("evidence_analyst", {
      evidence_findings: [
        { control_code: "TPR-001", evidence_status: "not_evidenced", implementation_status: "unknown" }
      ]
    });
    const finding = (output.metadata.evidence_findings as Array<{ evidence_status: string; implementation_status: string }>)[0]!;
    return finding.evidence_status === "not_evidenced" && finding.implementation_status !== "not_implemented"
      ? pass("evidence_analyst preserves not_evidenced semantics")
      : fail("evidence_analyst preserves not_evidenced semantics", failMetric(baseMetrics(), "not_evidenced_misclassification_count"));
  }
};
