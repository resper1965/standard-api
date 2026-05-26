import { SecurityEventService } from "@standard/observability";
import { roleHasPermission, type StandardRole, type StandardResource } from "@standard/auth";
import type { Permission } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

/**
 * Returns true if the current session belongs to a platform admin.
 * Platform admins have cross-tenant access and bypass all tenant checks.
 * The flag is stored as `platform_admin` boolean on the user row —
 * never as a role string, to avoid confusion with org-scoped roles.
 */
export const isPlatformAdmin = (context: RequestContext): boolean => {
  const user = context.session?.user as Record<string, unknown> | undefined;
  return user?.["platformAdmin"] === true;
};

/**
 * Guards a route so only platform admins (Bekaa operators) can access it.
 * Logs the access attempt and throws 403 for any other actor.
 *
 * Use on all /api/v1/tenants/* and /api/v1/admin/* routes.
 */
export const requirePlatformAdmin = async (context: RequestContext): Promise<void> => {
  if (isPlatformAdmin(context)) {
    // Log successful platform admin access for auditability.
    await context.deps.audit.record("platform_admin.access", {
      actor_id: context.actorId,
      path: context.request.url,
      trace_id: context.traceId,
    });
    return;
  }

  // Record the unauthorized attempt before throwing.
  await new SecurityEventService(context.deps.observability).record({
    tenant_id: context.tenantId,
    actor_id: context.actorId,
    event_type: "forbidden_access_attempt",
    severity: "high",
    outcome: "denied",
    source: "api-gateway",
    resource_type: "platform_admin_route",
    resource_id: context.request.url,
    message_safe: "Platform admin access required.",
    trace_id: context.traceId,
    metadata_safe: { reason: "not_platform_admin" },
  });

  throw new ApiError("FORBIDDEN", "Platform admin access required.", 403, [
    { reason: "not_platform_admin" },
  ]);
};

export const assertRbac = async (context: RequestContext, requiredPermissions: Permission[] = []): Promise<void> => {
  if (requiredPermissions.length === 0) return;

  // Platform admins bypass all permission checks — they have implicit ALL_PERMISSIONS.
  if (isPlatformAdmin(context)) return;

  let allowed = true;
  let reason = "";
  
  // If no auth context exists at all, explicitly deny.
  if (!context.auth && !context.session) {
    allowed = false;
    reason = "missing_auth_context";
  } else if (context.auth) {
    // Legacy MockAuthProvider or API Key auth — check permissions directly from auth context.
    // This path also applies in dev/test mode where context.auth and context.session coexist.
    const grantedPermissions = context.auth.permissions ?? [];
    for (const reqPerm of requiredPermissions) {
      if (!grantedPermissions.includes(reqPerm)) {
        allowed = false;
        reason = "permission_missing";
        break;
      }
    }
  } else if (context.session) {
    // Better Auth session (production) — use role-based permission check
    const role = (context.session.user?.role as StandardRole) || "viewer";
    for (const reqPerm of requiredPermissions) {
      const [resource, action] = reqPerm.split(":") as [StandardResource, string];
      if (!roleHasPermission(role, resource, action)) {
        allowed = false;
        reason = "permission_missing";
        break;
      }
    }
  }

  if (!allowed) {
    await context.deps.audit.record("security_permission_denied", {
      actor_id: context.actorId,
      tenant_id: context.tenantId,
      trace_id: context.traceId,
      reason,
      required_permissions: requiredPermissions
    });
    
    const isApprovalBypass = requiredPermissions.some((permission) => permission.includes(":approve"));

    if (isApprovalBypass && context.deps.alerts && context.tenantId && context.params.assessmentId) {
      void context.deps.alerts.fireApprovalBypass({
        tenantId: context.tenantId,
        assessmentId: context.params.assessmentId,
        artifactType: "assessment_state",
        traceId: context.traceId,
        ...(context.actorId ? { actorId: context.actorId } : {})
      });
    } else {
      await new SecurityEventService(context.deps.observability).record({
        tenant_id: context.tenantId,
        organization_id: context.securityTenant?.organization_id,
        assessment_id: context.params.assessmentId,
        actor_id: context.actorId,
        event_type: isApprovalBypass ? "approval_permission_denied" : "forbidden_access_attempt",
        severity: "medium",
        outcome: "denied",
        source: "api-gateway",
        resource_type: "route",
        resource_id: context.request.url,
        message_safe: "Permission denied.",
        trace_id: context.traceId,
        metadata_safe: { reason, required_permissions: requiredPermissions }
      });
    }

    throw new ApiError("FORBIDDEN", "Permission denied.", 403, [{ reason, required_permissions: requiredPermissions }]);
  }
};

