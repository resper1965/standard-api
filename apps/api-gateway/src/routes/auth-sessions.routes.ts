// @ts-nocheck -- Zod v4 CI type compat
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json } from "../http";

export const authSessionsRoutes: RouteDefinition[] = [
  {
    method: "DELETE",
    path: "/api/v1/auth/sessions/others",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      const repo = context.deps.authRepo;
      if (!repo) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "AuthRepository not available.",
          500,
        );
      }

      const userId = context.session?.user?.id;
      const sessionId = context.session?.session?.id;

      if (!userId || !sessionId) {
        throw new ApiError("UNAUTHORIZED", "Active session required.", 401);
      }

      await repo.revokeOtherSessions(userId, sessionId);

      await context.deps.audit.record("auth.sessions.revoked_others", {
        actor_id: context.actorId,
        trace_id: context.traceId,
      });

      return new Response(null, {
        status: 204,
        headers: { "x-trace-id": context.traceId },
      });
    },
  },
];
