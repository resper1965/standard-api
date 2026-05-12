import type { RequestContext } from "../http";

export const recordAuditPlaceholder = async (context: RequestContext, route: string): Promise<void> => {
  try {
    await context.deps.audit.record("api_request", {
      route,
      method: context.request.method,
      tenant_id: context.tenantId,
      actor_id: context.actorId,
      system_actor: context.systemActor,
      auth_method: context.auth?.auth_method,
      roles: context.auth?.roles,
      trace_id: context.traceId
    });
  } catch (err) {
    console.error("[standard:audit] Failed to record audit event:", err instanceof Error ? err.message : err);
  }
};
