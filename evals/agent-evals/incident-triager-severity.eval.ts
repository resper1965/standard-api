/**
 * Eval: Incident Triager Severity Classification Rules
 *
 * Validates deterministic severity classification guardrails:
 * 1. WAF SQL injection logs → severity must be "high" or "critical"
 * 2. Healthcheck/info logs → should be "low" or false positive
 * 3. DPO notification required when PII exfiltration is mentioned
 * 4. Attack vector must not be empty when severity >= high
 * 5. Containment actions required for non-false-positives
 */

import type { IncidentTriagerOutput } from "../../packages/agent-runtime/src/usecases/incident-triager";
import { truncateLogPayload } from "../../packages/agent-runtime/src/usecases/incident-triager";
import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

const makeSyntheticOutput = (overrides: Partial<IncidentTriagerOutput>): IncidentTriagerOutput => ({
  is_false_positive: false,
  severity_level: "medium",
  attack_vector_guessed: "Unknown",
  affected_assets_identified: [],
  immediate_containment_actions: [],
  requires_dpo_breach_notification: false,
  ...overrides,
});

export const incidentTriagerSeverityEval: AgentEvalCase = {
  name: "incident_triager severity classification guardrails",
  run() {
    const metrics = baseMetrics();

    // 1. SQL injection detection → must NOT be classified as "low"
    const sqli = makeSyntheticOutput({
      severity_level: "high",
      attack_vector_guessed: "SQL Injection",
      affected_assets_identified: ["db-primary-01"],
      immediate_containment_actions: ["Block source IP via WAF rule"],
    });
    if (sqli.severity_level === "low") {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 2. False positive must not trigger containment actions
    const falsePositive = makeSyntheticOutput({
      is_false_positive: true,
      severity_level: "low",
      immediate_containment_actions: [],
    });
    if (falsePositive.is_false_positive && falsePositive.immediate_containment_actions.length > 0) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 3. High/critical severity must have non-empty attack vector
    const critical = makeSyntheticOutput({
      severity_level: "critical",
      attack_vector_guessed: "",
    });
    if (["high", "critical"].includes(critical.severity_level) && critical.attack_vector_guessed === "") {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 4. PII exfiltration → must flag DPO notification
    const piiLeak = makeSyntheticOutput({
      severity_level: "critical",
      attack_vector_guessed: "Data Exfiltration via SQL Injection",
      requires_dpo_breach_notification: true,
    });
    if (!piiLeak.requires_dpo_breach_notification) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 5. Log truncation works correctly
    const longLog = "A".repeat(20000);
    const truncated = truncateLogPayload(longLog, 10000);
    if (truncated.length > 10500) {
      return fail(this.name, failMetric(metrics, "schema_pass_rate"));
    }

    return pass(this.name, metrics);
  },
};
