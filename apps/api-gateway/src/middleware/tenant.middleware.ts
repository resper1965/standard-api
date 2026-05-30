import { SecurityEventService } from "@standard/observability";
import { TenantResolver } from "@standard/security";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const resolveTenantContext = async (context: RequestContext, protectedRoute: boolean): Promise<void> => {
  const pathTenantId = context.params.tenantId;
  const headerTenantId =
    context.request.headers.get("x-standard-tenant-id") ??
    context.request.headers.get("x-tenant-id") ??
    undefined;
  const rawTenantId = headerTenantId ?? pathTenantId ?? context.tenantId;

  if (protectedRoute && !rawTenantId) {
    // Only enforce tenant requirement when there IS an authenticated actor.
    // If the request is unauthenticated, auth middleware will throw 401 first —
    // returning 400 here would leak that the route exists and confuse clients.
    if (!context.actorId) return;

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

  // Resolve Standard Native Auth Org text ID to standard UUID if resolver is available
  let resolvedTenantId = rawTenantId;
  let resolvedOrgId = context.params.organizationId;
  if (context.deps.resolveTenantContext && rawTenantId) {
    try {
      const resolved = await context.deps.resolveTenantContext(rawTenantId);
      if (resolved) {
        resolvedTenantId = resolved.tenant_id;
        resolvedOrgId = resolved.organization_id;
      }
    } catch (e) {
      console.error("[standard:tenant-middleware] Failed to resolve tenant context:", e);
    }
  }

  if (pathTenantId && headerTenantId && pathTenantId !== headerTenantId) {
    // Build structured mismatch alert for SOC
    const mismatchAlert = {
      queue_type: "soc_monitoring_alert" as const,
      alert_subtype: "tenant_mismatch_alert" as const,
      session_tenant_id: headerTenantId,
      payload_tenant_id: pathTenantId,
      actor_id: context.actorId ?? "anonymous",
      request_path: new URL(context.request.url).pathname,
      request_method: context.request.method,
      trace_id: context.traceId,
      ip_country: context.request.headers.get("cf-ipcountry") ?? undefined,
    };

    // Fire via AlertService if configured (high-fidelity path)
    if (context.deps.alerts) {
      void context.deps.alerts.fireTenantMismatch({
        tenantId: headerTenantId,
        expectedTenantId: pathTenantId,
        traceId: context.traceId,
        ...(context.actorId ? { actorId: context.actorId } : {})
      });
    }

    // Also enqueue to SOC queue for durable persistence (belt-and-suspenders)
    if ((context.deps as any).SOC_TRIAGE_QUEUE) {
      void (context.deps as any).SOC_TRIAGE_QUEUE.send(mismatchAlert).catch(() => {});
    }

    // SecurityEventService fallback (always record locally)
    void new SecurityEventService(context.deps.observability).record({
      tenant_id: headerTenantId,
      event_type: "tenant_context_mismatch",
      severity: "critical",
      outcome: "blocked",
      source: "api-gateway",
      message_safe: "Tenant context mismatch — request blocked.",
      trace_id: context.traceId
    });

    throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
  }

  context.tenantId = resolvedTenantId;
  if (resolvedOrgId) {
    context.organizationId = resolvedOrgId;
  }

  context.securityTenant = new TenantResolver().resolve({
    ...(headerTenantId ? { headerTenantId: resolvedTenantId } : {}),
    ...(pathTenantId ? { pathTenantId: resolvedTenantId } : {}),
    ...(context.actorId?.startsWith("m2m:") ? { apiKeyTenantId: resolvedTenantId } : { sessionTenantId: resolvedTenantId }),
    ...(context.params.organizationId ? { organizationId: resolvedOrgId } : {}),
    ...(context.params.assessmentId ? { assessmentId: context.params.assessmentId } : {}),
    hostname: new URL(context.request.url).hostname,
    traceId: context.traceId
  }) ?? undefined;
};

