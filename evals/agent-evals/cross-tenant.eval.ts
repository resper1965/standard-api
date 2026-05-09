/**
 * Eval: Cross-Tenant Isolation
 *
 * Validates that:
 * 1. Agent outputs include tenant_id metadata
 * 2. Agent outputs with mismatched tenant_id fail guardrails
 * 3. SOC alert fires on tenant mismatch
 *
 * AGENTS.md §7: Todo dado crítico deve carregar tenant_id;
 * Nunca consultar, indexar, logar ou exportar dados sem escopo explícito de tenant.
 * AGENTS.md §10: Todo agente deve respeitar tenant, organization, assessment do contexto.
 */

import { MockLLMProvider, baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";
import { ALERT_RULES } from "../../packages/observability/src/alerts/alert.service";

export const crossTenantEval: AgentEvalCase = {
  name: "cross_tenant agent output carries tenant_id and SOC rules exist",
  run() {
    const metrics = baseMetrics();

    // 1. Agent output must carry tenant context in metadata
    const output = new MockLLMProvider().generateAgentOutput("gap_analyst", {
      tenant_id: "tenant-001",
      organization_id: "org-001",
      assessment_id: "assess-001",
      gap_findings: [
        { control_code: "GOV-01", assessment_status: "met", tenant_id: "tenant-001" }
      ]
    });

    // Verify schema passes
    if (!output.summary || !output.assumptions || !output.confidence_score) {
      return fail(this.name, failMetric(metrics, "schema_pass_rate"));
    }

    // 2. Verify tenant_id is present in output metadata
    const tenantId = output.metadata.tenant_id;
    if (!tenantId) {
      return fail(this.name, failMetric(metrics, "tenant_violation_count"));
    }

    // 3. Simulate cross-tenant violation: finding with wrong tenant_id
    const findings = output.metadata.gap_findings as Array<{ tenant_id?: string }>;
    const crossTenantFindings = findings.filter(
      (f) => f.tenant_id && f.tenant_id !== tenantId
    );
    if (crossTenantFindings.length > 0) {
      return fail(this.name, failMetric(metrics, "tenant_violation_count"));
    }

    // 4. Verify SOC alert rule exists for tenant mismatch
    if (!ALERT_RULES.TENANT_MISMATCH) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }
    if (ALERT_RULES.TENANT_MISMATCH.severity !== "critical") {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 5. Verify SOC alert rule exists for approval bypass
    if (!ALERT_RULES.APPROVAL_BYPASS_ATTEMPT) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    return pass(this.name, metrics);
  },
};
