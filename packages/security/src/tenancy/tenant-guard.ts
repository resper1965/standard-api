import type { AccessDecision, SecurityTenantContext } from "@standard/schemas";

const decision = (allowed: boolean, reason: AccessDecision["reason"] | undefined, traceId: string): AccessDecision => ({
  allowed,
  ...(reason ? { reason } : {}),
  required_permissions: [],
  granted_permissions: [],
  trace_id: traceId
});

export class TenantGuard {
  validateBodyTenant(body: unknown, tenant: SecurityTenantContext): AccessDecision {
    if (!body || typeof body !== "object") return decision(true, undefined, tenant.trace_id);
    const value = body as Record<string, unknown>;
    if (typeof value.tenant_id === "string" && value.tenant_id !== tenant.tenant_id) {
      return decision(false, "tenant_mismatch", tenant.trace_id);
    }
    if (typeof value.organization_id === "string" && tenant.organization_id && value.organization_id !== tenant.organization_id) {
      return decision(false, "organization_mismatch", tenant.trace_id);
    }
    if (typeof value.assessment_id === "string" && tenant.assessment_id && value.assessment_id !== tenant.assessment_id) {
      return decision(false, "assessment_mismatch", tenant.trace_id);
    }
    return decision(true, undefined, tenant.trace_id);
  }

  validateAssessmentAccess(
    assessment: { tenant_id: string; organization_id: string; assessment_id: string },
    tenant: SecurityTenantContext
  ): AccessDecision {
    if (assessment.tenant_id !== tenant.tenant_id) return decision(false, "tenant_mismatch", tenant.trace_id);
    if (tenant.organization_id && assessment.organization_id !== tenant.organization_id) {
      return decision(false, "organization_mismatch", tenant.trace_id);
    }
    if (tenant.assessment_id && assessment.assessment_id !== tenant.assessment_id) {
      return decision(false, "assessment_mismatch", tenant.trace_id);
    }
    return decision(true, undefined, tenant.trace_id);
  }
}

