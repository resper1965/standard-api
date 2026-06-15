import type { AccessDecision, SecurityTenantContext } from "@standard/schemas";

const decision = (
  allowed: boolean,
  reason: AccessDecision["reason"] | undefined,
  traceId: string,
): AccessDecision => ({
  allowed,
  ...(reason ? { reason } : {}),
  required_permissions: [],
  granted_permissions: [],
  trace_id: traceId,
});

export class TenantGuard {
  validateBodyTenant(
    body: unknown,
    tenant: SecurityTenantContext,
  ): AccessDecision {
    const t = tenant as any;
    if (!body || typeof body !== "object")
      return decision(true, undefined, t.trace_id);
    const value = body as Record<string, unknown>;
    if (
      typeof value.organization_id === "string" &&
      value.organization_id !== t.organization_id
    ) {
      return decision(false, "tenant_mismatch", t.trace_id);
    }
    if (
      typeof value.organization_id === "string" &&
      t.organization_id &&
      value.organization_id !== t.organization_id
    ) {
      return decision(false, "organization_mismatch", t.trace_id);
    }
    if (
      typeof value.assessment_id === "string" &&
      t.assessment_id &&
      value.assessment_id !== t.assessment_id
    ) {
      return decision(false, "assessment_mismatch", t.trace_id);
    }
    return decision(true, undefined, t.trace_id);
  }

  validateAssessmentAccess(
    assessment: { organization_id: string; assessment_id: string },
    tenant: SecurityTenantContext,
  ): AccessDecision {
    const t = tenant as any;
    if (assessment.organization_id !== t.organization_id)
      return decision(false, "tenant_mismatch", t.trace_id);
    if (t.organization_id && assessment.organization_id !== t.organization_id) {
      return decision(false, "organization_mismatch", t.trace_id);
    }
    if (t.assessment_id && assessment.assessment_id !== t.assessment_id) {
      return decision(false, "assessment_mismatch", t.trace_id);
    }
    return decision(true, undefined, t.trace_id);
  }
}
