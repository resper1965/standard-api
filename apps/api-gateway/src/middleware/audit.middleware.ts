import type { RequestContext } from "../http";

/**
 * Record a structured audit event for every API request.
 *
 * Persists to the `audit_logs` table via the Drizzle adapter in production.
 * Captures: route, method, actor, tenant, auth method, IP, User-Agent, and trace ID.
 *
 * This is the production audit trail for SOC 2 / ISO 27001 compliance.
 */
export const recordAuditEvent = async (context: RequestContext, route: string): Promise<void> => {
  try {
    await context.deps.audit.record("api_request", {
      route,
      method: context.request.method,
      organization_id: context.organizationId,
      actor_id: context.actorId,
      system_actor: context.systemActor,
      auth_method: context.session ? "session" : context.m2mScopes ? "api_key" : context.auth?.auth_method ?? "none",
      ip_address: context.request.headers.get("cf-connecting-ip") ?? context.request.headers.get("x-forwarded-for") ?? undefined,
      user_agent: context.request.headers.get("user-agent") ?? undefined,
      trace_id: context.traceId
    });
  } catch (err) {
    console.error("[standard:audit] Failed to record audit event:", err instanceof Error ? err.message : err);
  }
};

/** @deprecated Use `recordAuditEvent` instead */
const recordAuditPlaceholder = recordAuditEvent;

