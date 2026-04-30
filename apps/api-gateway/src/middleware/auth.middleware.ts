import { SecurityEventService } from "@aegis/observability";
import { JwtAuthProvider } from "@aegis/security";
import type { Role } from "@aegis/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

const parseCsvHeader = (value: string | null): string[] =>
  value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

export const resolveActorContext = async (context: RequestContext, requireAuth: boolean, requireActor: boolean): Promise<void> => {
  const actorId = context.request.headers.get("x-aegis-actor-id") ?? undefined;
  const roles = parseCsvHeader(context.request.headers.get("x-aegis-roles")) as Role[];
  const authorization = context.request.headers.get("authorization") ?? undefined;

  if (requireAuth && !actorId) {
    await new SecurityEventService(context.deps.observability).record({
      tenant_id: context.tenantId,
      event_type: "unauthorized_access_attempt",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      message_safe: "Auth context is required.",
      trace_id: context.traceId
    });
    throw new ApiError("UNAUTHORIZED", "Auth context is required for this operation.", 401);
  }

  if (requireActor && !actorId) {
    await new SecurityEventService(context.deps.observability).record({
      tenant_id: context.tenantId,
      event_type: "unauthorized_access_attempt",
      severity: "medium",
      outcome: "denied",
      source: "api-gateway",
      message_safe: "Actor context is required.",
      trace_id: context.traceId
    });
    throw new ApiError("UNAUTHORIZED", "Actor context is required for this operation.", 401);
  }

  // Cloudflare native edge gateway authentication
  const provider = new JwtAuthProvider();
  const auth = await provider.authenticate({
    ...(actorId ? { actorId } : {}),
    ...(context.tenantId ? { tenantId: context.tenantId } : {}),
    ...(roles.length ? { roles } : {}),
    traceId: context.traceId,
    ...(authorization ? { authHeader: authorization } : {})
  });

  context.auth = auth ?? undefined;
  context.actorId = actorId;
  context.systemActor = actorId ? undefined : "anonymous";
};
