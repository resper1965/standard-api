import { SecurityEventService } from "@standard/observability";
import { TenantResolver } from "@standard/security";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const resolveOrganizationContext = async (context: RequestContext, protectedRoute: boolean): Promise<void> => {
  const pathTenantId = context.params.organizationId;
  const headerTenantId =
    context.request.headers.get("x-standard-tenant-id") ??
    context.request.headers.get("x-tenant-id") ??
    undefined;

  const isPlatformAdmin = context.session?.user?.platformAdmin === true;

  // Isolation checks are moved to the bottom after resolving organizationId and organizationId.

  const rawTenantId = headerTenantId ?? pathTenantId ?? context.organizationId;

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
  if (context.deps.resolveOrganizationContext && rawTenantId) {
    try {
      const resolved = await context.deps.resolveOrganizationContext(rawTenantId);
      if (resolved) {
        resolvedTenantId = resolved.organization_id;
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
        organizationId: headerTenantId,
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
      organization_id: headerTenantId,
      event_type: "tenant_context_mismatch",
      severity: "critical",
      outcome: "blocked",
      source: "api-gateway",
      message_safe: "Tenant context mismatch — request blocked.",
      trace_id: context.traceId
    });

    throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
  }

  context.organizationId = resolvedTenantId;
  if (resolvedOrgId) {
    context.organizationId = resolvedOrgId;
  }

  // Enforce tenant isolation for authenticated requests (after resolving context)
  if (context.organizationId && pathTenantId && !isPlatformAdmin) {
    let resolvedPathTenantId = pathTenantId;
    if (context.deps.resolveOrganizationContext) {
      try {
        const resolved = await context.deps.resolveOrganizationContext(pathTenantId);
        if (resolved) {
          resolvedPathTenantId = resolved.organization_id;
        }
      } catch (e) {
        // ignore
      }
    }
    if (resolvedPathTenantId !== context.organizationId) {
      throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
    }
  }

  // Enforce organization isolation for authenticated requests (after resolving context)
  const pathOrgId = context.params.organizationId;
  if (context.organizationId && pathOrgId && !isPlatformAdmin) {
    let resolvedPathOrgId = pathOrgId;
    if (context.deps.resolveOrganizationContext) {
      try {
        const resolved = await context.deps.resolveOrganizationContext(pathOrgId);
        if (resolved) {
          resolvedPathOrgId = resolved.organization_id;
        }
      } catch (e) {
        // ignore resolution error
      }
    }
    if (resolvedPathOrgId !== context.organizationId) {
      throw new ApiError("FORBIDDEN", "Organization context mismatch.", 403);
    }
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

