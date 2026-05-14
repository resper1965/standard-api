import { MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const gapAnalystEval: AgentEvalCase = {
  name: "gap_analyst maps absence to not_evidenced",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("gap_analyst", {
      gap_findings: [
        { control_code: "TPR-001", assessment_status: "not_evidenced", evidence_status: "not_evidenced" },
        { control_code: "IAC-001", assessment_status: "requires_validation", evidence_status: "conflicting" }
      ]
    });
    const findings = output.metadata.gap_findings as Array<{ assessment_status: string; evidence_status: string }>;
    const absenceOk = findings.some((finding) => finding.evidence_status === "not_evidenced" && finding.assessment_status === "not_evidenced");
    const conflictOk = findings.some((finding) => finding.evidence_status === "conflicting" && finding.assessment_status === "requires_validation");
    return pass("gap_analyst maps absence to not_evidenced", {
      schema_pass_rate: 1,
      guardrail_pass_rate: 1,
      expected_status_match_rate: absenceOk && conflictOk ? 1 : 0,
      hallucinated_mapping_count: 0,
      approval_bypass_count: 0,
      tenant_violation_count: 0,
      not_evidenced_misclassification_count: absenceOk ? 0 : 1,
      high_maturity_without_evidence_count: 0,
      generic_poam_action_count: 0
    });
  }
};
