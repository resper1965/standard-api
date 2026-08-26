import { SecurityEventService } from "@standard/observability";
import { TenantResolver } from "@standard/security";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const resolveOrganizationContext = async (
  context: RequestContext,
  protectedRoute: boolean,
): Promise<void> => {
  const pathTenantId = context.params.organizationId;
  const headerTenantId =
    context.request.headers.get("x-standard-tenant-id") ??
    context.request.headers.get("x-tenant-id") ??
    undefined;

  const isPlatformAdmin = context.session?.user?.platformAdmin === true;

  // â”€â”€ IDOR FIX (Issue #71) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Session organization ALWAYS takes precedence over untrusted headers.
  // If the user has an active session, the header can ONLY be used to switch
  // among their allowed organizations. An arbitrary header value from an
  // attacker who is not a member of that org is rejected with 403.
  //
  // Priority order:
  //   1. Session activeOrganizationId (trusted, set by auth middleware)
  //   2. Header org (ONLY if validated against allowedOrganizations)
  //   3. Path param org (for route-scoped endpoints)
  //   4. context.organizationId (fallback from prior middleware)

  let rawTenantId: string | undefined;

  if (
    context.session &&
    context.actorId &&
    !context.actorId.startsWith("m2m:")
  ) {
    // Interactive session: session org is the primary source of truth
    const sessionOrgId = context.organizationId; // Already set by auth middleware

    if (headerTenantId && headerTenantId !== sessionOrgId) {
      // Header is requesting a DIFFERENT org than the session's active org.
      // Only allow if the user is a member of that org (platform admins bypass).
      // Simplified auth: 1 user = 1 org. No org switching for non-platform-admins.
      if (!isPlatformAdmin) {
        void new SecurityEventService(context.deps.observability).record({
          organization_id: sessionOrgId,
          event_type: "cross_tenant_access_blocked",
          severity: "critical",
          outcome: "blocked",
          source: "api-gateway",
          message_safe:
            "Header x-standard-tenant-id does not match session org (1:1 model).",
          trace_id: context.traceId,
        });
        throw new ApiError(
          "FORBIDDEN",
          "You can only access your own organization.",
          403,
        );
      }
      // User IS a member â€” allow org switch via header
      rawTenantId = headerTenantId;
    } else {
      // No header override or same org â€” use session org
      rawTenantId = sessionOrgId ?? pathTenantId;
    }
  } else if (context.actorId?.startsWith("m2m:")) {
    // â”€â”€ IDOR FIX (M2M parity with the session branch above) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // An API key is bound to exactly one organization; auth.middleware already
    // put that organization in context.organizationId from the key record.
    // It is the ONLY source of truth here â€” a client-supplied header must never
    // be able to repoint a key at another tenant. Accept the header only when it
    // names the same org (clients echo it for symmetry with the browser flow).
    const keyOrgId = context.organizationId;

    if (headerTenantId && keyOrgId && headerTenantId !== keyOrgId) {
      // The header may carry a slug while the key carries a UUID â€” resolve
      // before deciding, so a legitimate echo is not rejected as an attack.
      let resolvedHeaderOrgId = headerTenantId;
      if (context.deps.resolveOrganizationContext) {
        try {
          const resolved =
            await context.deps.resolveOrganizationContext(headerTenantId);
          if (resolved) resolvedHeaderOrgId = resolved.organization_id;
        } catch {
          // Resolution failed â€” fall through to the mismatch check below.
        }
      }

      if (resolvedHeaderOrgId !== keyOrgId) {
        void new SecurityEventService(context.deps.observability).record({
          organization_id: keyOrgId,
          actor_id: context.actorId,
          event_type: "cross_tenant_access_blocked",
          severity: "critical",
          outcome: "blocked",
          source: "api-gateway",
          message_safe:
            "Header x-standard-tenant-id does not match the API key organization.",
          trace_id: context.traceId,
        });
        throw new ApiError(
          "FORBIDDEN",
          "This API key can only access its own organization.",
          403,
        );
      }
    }

    rawTenantId = keyOrgId ?? headerTenantId ?? pathTenantId;
  } else {
    // Unauthenticated: no trusted context to defend, auth middleware gates the
    // route. Keep the original resolution order.
    rawTenantId = headerTenantId ?? pathTenantId ?? context.organizationId;
  }

  if (protectedRoute && !rawTenantId) {
    // Only enforce tenant requirement when there IS an authenticated actor.
    // If the request is unauthenticated, auth middleware will throw 401 first â€”
    // returning 400 here would leak that the route exists and confuse clients.
    if (!context.actorId) return;

    void new SecurityEventService(context.deps.observability).record({
      event_type: "tenant_context_missing",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      message_safe: "Tenant context is required.",
      trace_id: context.traceId,
    });
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "Tenant context is required.",
      400,
    );
  }

  // Resolve Standard Native Auth Org text ID to standard UUID if resolver is available
  let resolvedTenantId = rawTenantId;
  let resolvedOrgId = context.params.organizationId;
  if (context.deps.resolveOrganizationContext && rawTenantId) {
    try {
      const resolved =
        await context.deps.resolveOrganizationContext(rawTenantId);
      if (resolved) {
        resolvedTenantId = resolved.organization_id;
        resolvedOrgId = resolved.organization_id;
      }
    } catch (e) {
      // Fail closed. Continuing here would fall through to the raw,
      // client-supplied identifier as the tenant context - turning a database
      // blip into a tenant-isolation failure (audit M-06).
      console.error(
        "[standard:tenant-middleware] Failed to resolve tenant context:",
        e,
      );
      // 503 rather than a new error code: ApiErrorCode is part of the public
      // API contract and consumers validate against it, so a security fix is
      // not the place to widen it. The status carries the semantics.
      throw new ApiError(
        "INTERNAL_ERROR",
        "Unable to resolve organization context.",
        503,
      );
    }
  }

  if (pathTenantId && headerTenantId && pathTenantId !== headerTenantId) {
    // Platform admins have cross-tenant access â€” skip mismatch check
    if (!isPlatformAdmin) {
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
          ...(context.actorId ? { actorId: context.actorId } : {}),
        });
      }

      // Also enqueue to SOC queue for durable persistence (belt-and-suspenders)
      if ((context.deps as any).SOC_TRIAGE_QUEUE) {
        void (context.deps as any).SOC_TRIAGE_QUEUE.send(mismatchAlert).catch(
          () => {},
        );
      }

      // SecurityEventService fallback (always record locally)
      void new SecurityEventService(context.deps.observability).record({
        organization_id: headerTenantId,
        event_type: "tenant_context_mismatch",
        severity: "critical",
        outcome: "blocked",
        source: "api-gateway",
        message_safe: "Tenant context mismatch â€” request blocked.",
        trace_id: context.traceId,
      });

      throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
    }
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
        const resolved =
          await context.deps.resolveOrganizationContext(pathTenantId);
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
        const resolved =
          await context.deps.resolveOrganizationContext(pathOrgId);
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

  context.securityTenant =
    new TenantResolver().resolve({
      ...(headerTenantId ? { headerTenantId: resolvedTenantId } : {}),
      ...(pathTenantId ? { pathTenantId: resolvedTenantId } : {}),
      ...(context.actorId?.startsWith("m2m:")
        ? { apiKeyTenantId: resolvedTenantId }
        : { sessionTenantId: resolvedTenantId }),
      ...(context.params.organizationId
        ? { organizationId: resolvedOrgId }
        : {}),
      ...(context.params.assessmentId
        ? { assessmentId: context.params.assessmentId }
        : {}),
      hostname: new URL(context.request.url).hostname,
      traceId: context.traceId,
    }) ?? undefined;
};
