import { evidenceAnalystEval } from "./agent-evals/evidence-analyst.eval";
import { frameworkMapperEval } from "./agent-evals/framework-mapper.eval";
import { gapAnalystEval } from "./agent-evals/gap-analyst.eval";
import { maturityAssessorEval } from "./agent-evals/maturity-assessor.eval";
import { poamPlannerEval } from "./agent-evals/poam-planner.eval";
import { reportWriterEval } from "./agent-evals/report-writer.eval";
import { soaArchitectEval } from "./agent-evals/soa-architect.eval";
import type { AgentEvalCase, EvalMetrics } from "./agent-evals/eval-kit";

const evals: AgentEvalCase[] = [
  frameworkMapperEval,
  soaArchitectEval,
  evidenceAnalystEval,
  gapAnalystEval,
  maturityAssessorEval,
  poamPlannerEval,
  reportWriterEval
];

const aggregate = (metrics: EvalMetrics[]): EvalMetrics => {
  const total = metrics.length || 1;
  return {
    schema_pass_rate: metrics.reduce((sum, metric) => sum + metric.schema_pass_rate, 0) / total,
    guardrail_pass_rate: metrics.reduce((sum, metric) => sum + metric.guardrail_pass_rate, 0) / total,
    expected_status_match_rate: metrics.reduce((sum, metric) => sum + metric.expected_status_match_rate, 0) / total,
    hallucinated_mapping_count: metrics.reduce((sum, metric) => sum + metric.hallucinated_mapping_count, 0),
    approval_bypass_count: metrics.reduce((sum, metric) => sum + metric.approval_bypass_count, 0),
    tenant_violation_count: metrics.reduce((sum, metric) => sum + metric.tenant_violation_count, 0),
    not_evidenced_misclassification_count: metrics.reduce((sum, metric) => sum + metric.not_evidenced_misclassification_count, 0),
    high_maturity_without_evidence_count: metrics.reduce((sum, metric) => sum + metric.high_maturity_without_evidence_count, 0),
    generic_poam_action_count: metrics.reduce((sum, metric) => sum + metric.generic_poam_action_count, 0)
  };
};

const results = evals.map((agentEval) => agentEval.run());
for (const result of results) {
  console.log(`${result.passed ? "ok" : "not ok"} - ${result.name}`);
}

const metrics = aggregate(results.map((result) => result.metrics));
console.log(JSON.stringify({ eval_count: results.length, metrics }, null, 2));

if (results.some((result) => !result.passed)) {
  throw new Error("Synthetic agent evals failed");
}
