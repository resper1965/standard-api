import type { RequestContext } from "../http";

export const assertRateLimitPlaceholder = async (context: RequestContext, route: string): Promise<void> => {
  if (
    route.includes("/documents") ||
    route.includes("/kb/search") ||
    route.includes("/agent-runs") ||
    route.includes("/render") ||
    route.includes("/admin/")
  ) {
    await context.deps.audit.record("security_rate_limit_placeholder_checked", {
      route,
      tenant_id: context.tenantId,
      actor_id: context.actorId,
      trace_id: context.traceId
    });
  }
};
