import { SecurityEventService } from "@standard/observability";
import { TenantResolver } from "@standard/security";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const resolveTenantContext = (context: RequestContext, protectedRoute: boolean): void => {
  const pathTenantId = context.params.tenantId;
  const headerTenantId = context.request.headers.get("x-standard-tenant-id") ?? undefined;
  const resolvedTenantId = headerTenantId ?? pathTenantId;

  if (protectedRoute && !resolvedTenantId) {
    void new SecurityEventService(context.deps.observability).record({
      event_type: "tenant_context_missing",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      message_safe: "Tenant context is required.",
      trace_id: context.traceId
    });
    throw new ApiError("TENANT_CONTEXT_REQUIRED", "Tenant context is required.", 400);
  }

  if (pathTenantId && headerTenantId && pathTenantId !== headerTenantId) {
    if (context.deps.alerts) {
      void context.deps.alerts.fireTenantMismatch({
        tenantId: headerTenantId,
        expectedTenantId: pathTenantId,
        traceId: context.traceId,
        ...(context.actorId ? { actorId: context.actorId } : {})
      });
    } else {
      void new SecurityEventService(context.deps.observability).record({
        tenant_id: headerTenantId,
        event_type: "tenant_context_mismatch",
        severity: "high",
        outcome: "blocked",
        source: "api-gateway",
        message_safe: "Tenant context mismatch.",
        trace_id: context.traceId
      });
    }
    throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
  }

  context.tenantId = resolvedTenantId;
  context.securityTenant = new TenantResolver().resolve({
    ...(headerTenantId ? { headerTenantId } : {}),
    ...(pathTenantId ? { pathTenantId } : {}),
    ...(context.params.organizationId ? { organizationId: context.params.organizationId } : {}),
    ...(context.params.assessmentId ? { assessmentId: context.params.assessmentId } : {}),
    hostname: new URL(context.request.url).hostname,
    traceId: context.traceId
  }) ?? undefined;
};

