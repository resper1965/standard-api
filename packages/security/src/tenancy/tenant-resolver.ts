import type { SecurityTenantContext } from "@aegis/schemas";

export type ResolveTenantInput = {
  headerTenantId?: string;
  pathTenantId?: string;
  organizationId?: string;
  assessmentId?: string;
  hostname?: string;
  traceId: string;
};

export class TenantResolver {
  resolve(input: ResolveTenantInput): SecurityTenantContext | null {
    const tenantId = input.headerTenantId ?? input.pathTenantId;
    if (!tenantId) return null;
    return {
      tenant_id: tenantId,
      ...(input.organizationId ? { organization_id: input.organizationId } : {}),
      ...(input.assessmentId ? { assessment_id: input.assessmentId } : {}),
      ...(input.hostname ? { hostname: input.hostname } : {}),
      source: input.headerTenantId ? "header" : "route_param",
      resolved_at: new Date().toISOString(),
      trace_id: input.traceId
    };
  }
}
