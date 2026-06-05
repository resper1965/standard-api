import { SecurityEventService } from "@standard/observability";
import { roleHasPermission, STANDARD_ROLE_PERMISSIONS, type StandardRole, type StandardResource } from "@standard/auth";
import type { Permission } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

/**
 * Returns true if the current session belongs to a platform admin.
 * Platform admins have cross-tenant access and bypass all tenant checks.
 * The flag is stored as `platform_admin` boolean on the user row —
 * never as a role string, to avoid confusion with org-scoped roles.
 */
const isPlatformAdmin = (context: RequestContext): boolean => {
  // platformAdmin is explicitly typed in RequestContext.session.user (http.ts)
  // and populated by auth.middleware.ts from the Standard Native Auth `additionalFields.platformAdmin`.
  return (
    context.session?.user?.platformAdmin === true ||
    (context.session?.user as any)?.platform_admin === true
  );
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
    organization_id: context.organizationId,
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
  if (!context.auth && !context.session && !context.m2mScopes) {
    allowed = false;
    reason = "missing_auth_context";
  } else if (context.m2mScopes) {
    // Machine-to-Machine API Key authentication
    // Wildcard keys (empty scopes array) bypass all permission/scope checks
    if (context.m2mScopes.length === 0) {
      allowed = true;
    } else {
      for (const reqPerm of requiredPermissions) {
        if (!context.m2mScopes.includes(reqPerm)) {
          allowed = false;
          reason = "permission_missing";
          break;
        }
      }
    }
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
    // Standard Native Auth session (production) — use role-based permission check.
    // API access roles: owner, admin, member, viewer.
    // Better Auth default "user" → "member". Unknown → "viewer" (least privilege).
    const rawRole = context.session.user?.role ?? "viewer";
    const role: StandardRole = (rawRole in STANDARD_ROLE_PERMISSIONS)
      ? (rawRole as StandardRole)
      : (rawRole === "user" ? "member" : "viewer");

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
      organization_id: context.organizationId,
      trace_id: context.traceId,
      reason,
      required_permissions: requiredPermissions
    });
    
    const isApprovalBypass = requiredPermissions.some((permission) => permission.includes(":approve"));

    if (isApprovalBypass && context.deps.alerts && context.organizationId && context.params.assessmentId) {
      void context.deps.alerts.fireApprovalBypass({
        organizationId: context.organizationId,
        assessmentId: context.params.assessmentId,
        artifactType: "assessment_state",
        traceId: context.traceId,
        ...(context.actorId ? { actorId: context.actorId } : {})
      });
    } else {
      await new SecurityEventService(context.deps.observability).record({
        organization_id: context.organizationId ?? context.securityTenant?.organization_id,
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

/**
 * Guards a route so only requests with a resolved organization context can proceed.
 *
 * This enforces the invariant that ALL users — including platform admins (Bekaa
 * operators) — must be scoped to an organization. Platform admins are auto-scoped
 * to the Bekaa operator org by auth.middleware.ts; this guard is the final check.
 *
 * Use on any route that writes or reads tenant-scoped data (assessments, KB, etc.).
 */
const requireOrganizationContext = async (context: RequestContext): Promise<void> => {
  if (context.organizationId && context.organizationId) return;

  await new SecurityEventService(context.deps.observability).record({
    organization_id: context.organizationId,
    actor_id: context.actorId,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    resource_type: "organization_context",
    resource_id: context.request.url,
    message_safe: "Organization context required. Select or create an organization first.",
    trace_id: context.traceId,
    metadata_safe: { reason: "organization_context_missing" },
  });

  throw new ApiError(
    "ORGANIZATION_REQUIRED",
    "An active organization is required for this operation. Please select or create an organization.",
    403,
    [{ reason: "organization_context_missing" }]
  );
};
