import { SecurityEventService } from "@aegis/observability";
import { roleHasPermission, type AegisRole, type AegisResource } from "@aegis/auth";
import type { Permission } from "@aegis/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const assertRbac = async (context: RequestContext, requiredPermissions: Permission[] = []): Promise<void> => {
  if (requiredPermissions.length === 0) return;

  let allowed = true;
  let reason = "";
  
  // If no auth context exists at all, explicitly deny.
  if (!context.auth && !context.session) {
    allowed = false;
    reason = "missing_auth_context";
  } else {
    // Legacy support vs Better Auth session
    const role = (context.session?.user?.role as AegisRole) || "viewer";
    
    // Evaluate mapped permissions
    for (const reqPerm of requiredPermissions) {
      const [resource, action] = reqPerm.split(":") as [AegisResource, string];
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
    
    await new SecurityEventService(context.deps.observability).record({
      tenant_id: context.tenantId,
      organization_id: context.securityTenant?.organization_id,
      assessment_id: context.params.assessmentId,
      actor_id: context.actorId,
      event_type: requiredPermissions.some((permission) => permission.includes(":approve")) ? "approval_permission_denied" : "forbidden_access_attempt",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      resource_type: "route",
      resource_id: context.request.url,
      message_safe: "Permission denied.",
      trace_id: context.traceId,
      metadata_safe: { reason, required_permissions: requiredPermissions }
    });
    throw new ApiError("FORBIDDEN", "Permission denied.", 403, [{ reason, required_permissions: requiredPermissions }]);
  }
};
