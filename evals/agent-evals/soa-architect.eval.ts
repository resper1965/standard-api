import { MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const soaArchitectEval: AgentEvalCase = {
  name: "soa_architect requires_validation when mapping is missing",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("scope_soa_architect", {
      soa_items: [
        { control_code: "GOV-001", applicability_status: "applicable", mapping_type: "official" },
        { control_code: "UNMAPPED-001", applicability_status: "requires_validation", mapping_type: "none" }
      ]
    });
    const items = output.metadata.soa_items as Array<{ mapping_type: string; applicability_status: string }>;
    const unmappedOk = items.some((item) => item.mapping_type === "none" && item.applicability_status === "requires_validation");
    return pass("soa_architect requires_validation when mapping is missing", {
      schema_pass_rate: 1,
      guardrail_pass_rate: unmappedOk ? 1 : 0,
      expected_status_match_rate: unmappedOk ? 1 : 0,
      hallucinated_mapping_count: 0,
      approval_bypass_count: 0,
      tenant_violation_count: 0,
      not_evidenced_misclassification_count: 0,
      high_maturity_without_evidence_count: 0,
      generic_poam_action_count: 0
    });
  }
};
