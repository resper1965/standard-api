import { PERMISSION_TO_SCOPE } from "@standard/schemas";
import { SecurityEventService } from "@standard/observability";

import type { Permission } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

/**
 * Returns true if the current session belongs to a platform admin.
 * Platform admins have cross-tenant access and bypass all tenant checks.
 * The flag is stored as `platform_admin` boolean on the user row â€”
 * never as a role string, to avoid confusion with org-scoped roles.
 */
const isPlatformAdmin = (context: RequestContext): boolean => {
  // platformAdmin is explicitly typed in RequestContext.session.user (http.ts)
  // and populated by auth.middleware.ts from the Standard Native Auth `additionalFields.platformAdmin`.
  return context.session?.user?.platformAdmin === true;
};

/**
 * Guards a route so only platform admins (Bekaa operators) can access it.
 * Logs the access attempt and throws 403 for any other actor.
 *
 * Use on all /api/v1/tenants/* and /api/v1/admin/* routes.
 */
export const requirePlatformAdmin = async (
  context: RequestContext,
): Promise<void> => {
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

async function gatherActorPermissions(
  context: RequestContext,
): Promise<string[]> {
  const actorPermissions: string[] = [];

  // M2M API key scopes (highest priority â€” explicit scope grants)
  if (context.m2mScopes && context.m2mScopes.length > 0) {
    actorPermissions.push(...context.m2mScopes);
  }

  // Auth context permissions (from MockAuthProvider or Standard Native Auth)
  if (context.auth?.permissions) {
    actorPermissions.push(...context.auth.permissions);
  }

  // Session-based role resolution.
  if (actorPermissions.length === 0 && context.session) {
    const { DEFAULT_ROLE_PERMISSIONS } = await import("@standard/security");

    // Resolve role from session — auth.middleware.ts normalises to
    // "platform_admin" or "org_admin". The legacy "customer" value is mapped
    // to "org_admin" for backward compatibility.
    const rawRole = context.session.user?.role as string | undefined;
    const userRole = (
      rawRole === "customer" ? "org_admin" : (rawRole ?? "org_admin")
    ) as keyof typeof DEFAULT_ROLE_PERMISSIONS;

    const rolePerms =
      DEFAULT_ROLE_PERMISSIONS[userRole] ??
      DEFAULT_ROLE_PERMISSIONS["org_admin"];
    if (rolePerms) actorPermissions.push(...rolePerms);
  }

  return actorPermissions;
}

async function handleRbacDenied(
  context: RequestContext,
  reason: string,
  requiredPermissions: Permission[],
): Promise<never> {
  await context.deps.audit.record("security_permission_denied", {
    actor_id: context.actorId,
    organization_id: context.organizationId,
    trace_id: context.traceId,
    reason,
    required_permissions: requiredPermissions,
  });

  const isApprovalBypass = requiredPermissions.some((permission) =>
    permission.includes(":approve"),
  );

  if (
    isApprovalBypass &&
    context.deps.alerts &&
    context.organizationId &&
    context.params.assessmentId
  ) {
    void context.deps.alerts.fireApprovalBypass({
      organizationId: context.organizationId,
      assessmentId: context.params.assessmentId,
      artifactType: "assessment_state",
      traceId: context.traceId,
      ...(context.actorId ? { actorId: context.actorId } : {}),
    });
  } else {
    await new SecurityEventService(context.deps.observability).record({
      organization_id:
        context.organizationId ?? context.securityTenant?.organization_id,
      assessment_id: context.params.assessmentId,
      actor_id: context.actorId,
      event_type: isApprovalBypass
        ? "approval_permission_denied"
        : "forbidden_access_attempt",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      resource_type: "route",
      resource_id: context.request.url,
      message_safe: "Permission denied.",
      trace_id: context.traceId,
      metadata_safe: { reason, required_permissions: requiredPermissions },
    });
  }

  throw new ApiError("FORBIDDEN", "Permission denied.", 403, [
    { reason, required_permissions: requiredPermissions },
  ]);
}

export const assertRbac = async (
  context: RequestContext,
  requiredPermissions: Permission[] = [],
): Promise<void> => {
  if (requiredPermissions.length === 0) return;

  // Platform admins bypass all permission checks
  if (isPlatformAdmin(context)) return;

  // Verify auth context exists
  if (!context.auth && !context.session && !context.m2mScopes) {
    await handleRbacDenied(
      context,
      "missing_auth_context",
      requiredPermissions,
    );
  }

  // Check that the actor's permissions include ALL required permissions.
  //
  // M2M keys carry SCOPES ("gap:write"), routes declare PERMISSIONS
  // ("evidence:run"), and the two are different vocabularies. Comparing them
  // directly only happened to work where a permission and its scope share a
  // name - "scf:read" maps to "scf:read", which is exactly why /scf/* worked
  // for API keys while /gap/evaluate-evidence returned "Permission denied."
  // after its scope check had already passed. Translate before comparing.
  const actorPermissions = await gatherActorPermissions(context);
  const missingPermissions = requiredPermissions.filter((perm) => {
    if (actorPermissions.includes(perm)) return false;
    const scope = PERMISSION_TO_SCOPE[perm];
    return !(scope && actorPermissions.includes(scope));
  });

  if (missingPermissions.length > 0) {
    await handleRbacDenied(
      context,
      "insufficient_permissions",
      requiredPermissions,
    );
  }
};
