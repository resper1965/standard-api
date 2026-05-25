import type { SecurityTenantContext } from "@standard/schemas";

export type ResolveTenantInput = {
  headerTenantId?: string | undefined;
  pathTenantId?: string | undefined;
  sessionTenantId?: string | undefined;
  apiKeyTenantId?: string | undefined;
  organizationId?: string | undefined;
  assessmentId?: string | undefined;
  hostname?: string | undefined;
  traceId: string;
};

export class TenantResolver {
  resolve(input: ResolveTenantInput): SecurityTenantContext | null {
    const tenantId =
      input.headerTenantId ??
      input.pathTenantId ??
      input.sessionTenantId ??
      input.apiKeyTenantId;
    if (!tenantId) return null;

    let source: "jwt" | "api_key" | "hostname" | "header" | "route_param" | "internal_worker" = "route_param";
    if (input.headerTenantId) {
      source = "header";
    } else if (input.pathTenantId) {
      source = "route_param";
    } else if (input.apiKeyTenantId) {
      source = "api_key";
    } else if (input.sessionTenantId) {
      source = "jwt";
    }

    return {
      tenant_id: tenantId,
      ...(input.organizationId ? { organization_id: input.organizationId } : {}),
      ...(input.assessmentId ? { assessment_id: input.assessmentId } : {}),
      ...(input.hostname ? { hostname: input.hostname } : {}),
      source,
      resolved_at: new Date().toISOString(),
      trace_id: input.traceId
    };
  }
}

