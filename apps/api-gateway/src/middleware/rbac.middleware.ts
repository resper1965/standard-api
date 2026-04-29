import { SecurityEventService } from "@aegis/observability";
import { PolicyEngine } from "@aegis/security";
import type { Permission } from "@aegis/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

export const assertRbac = async (context: RequestContext, requiredPermissions: Permission[] = []): Promise<void> => {
  if (requiredPermissions.length === 0) return;

  const decision = new PolicyEngine().authorize({
    auth: context.auth,
    tenant: context.securityTenant,
    required_permissions: requiredPermissions,
    trace_id: context.traceId
  });

  if (!decision.allowed) {
    await context.deps.audit.record("security_permission_denied", {
      actor_id: context.actorId,
      tenant_id: context.tenantId,
      trace_id: context.traceId,
      reason: decision.reason,
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
      metadata_safe: { reason: decision.reason, required_permissions: requiredPermissions }
    });
    throw new ApiError("FORBIDDEN", "Permission denied.", 403, [{ reason: decision.reason, required_permissions: requiredPermissions }]);
  }
};
