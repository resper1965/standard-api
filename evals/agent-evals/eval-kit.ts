import { AgentOutputSchema, type AgentOutput } from "../../packages/schemas/src/agent-runtime";

export type EvalMetrics = {
  schema_pass_rate: number;
  guardrail_pass_rate: number;
  expected_status_match_rate: number;
  hallucinated_mapping_count: number;
  approval_bypass_count: number;
  tenant_violation_count: number;
  not_evidenced_misclassification_count: number;
  high_maturity_without_evidence_count: number;
  generic_poam_action_count: number;
};

export type EvalResult = {
  name: string;
  passed: boolean;
  metrics: EvalMetrics;
};

export type AgentEvalCase = {
  name: string;
  run: () => EvalResult;
};

export class MockLLMProvider {
  generateAgentOutput(agentId: string, metadata: Record<string, unknown>): AgentOutput {
    return AgentOutputSchema.parse({
      summary: `Deterministic synthetic output for ${agentId}.`,
      assumptions: ["Synthetic fixtures are complete for this eval."],
      limitations: ["No real LLM provider or customer data was used."],
      sources: ["synthetic-fixtures", "synthetic-golden"],
      confidence_score: 0.72,
      writes_final_finding: false,
      creates_official_mapping: false,
      metadata
    });
  }
}

export const baseMetrics = (): EvalMetrics => ({
  schema_pass_rate: 1,
  guardrail_pass_rate: 1,
  expected_status_match_rate: 1,
  hallucinated_mapping_count: 0,
  approval_bypass_count: 0,
  tenant_violation_count: 0,
  not_evidenced_misclassification_count: 0,
  high_maturity_without_evidence_count: 0,
  generic_poam_action_count: 0
});

export const failMetric = (metrics: EvalMetrics, key: keyof EvalMetrics): EvalMetrics => ({
  ...metrics,
  [key]: typeof metrics[key] === "number" && key.endsWith("_rate") ? 0 : Number(metrics[key]) + 1
});

export const pass = (name: string, metrics = baseMetrics()): EvalResult => ({ name, passed: true, metrics });
export const fail = (name: string, metrics: EvalMetrics): EvalResult => ({ name, passed: false, metrics });
