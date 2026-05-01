/**
 * @module auth.middleware
 * @description Resolves authentication context from Better Auth session.
 *
 * Better Auth sessions are resolved from cookies (browser) or API keys (programmatic).
 * The active organization in the session maps to the Aegis tenant_id.
 */
import type { AegisAuth } from "@aegis/auth";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

/**
 * Resolve auth context from Better Auth session.
 *
 * Sets `context.actorId`, `context.tenantId`, and `context.session`.
 * If `requireAuth` is true and no valid session exists, throws 401.
 */
export const resolveAuthContext = async (
  context: RequestContext,
  auth: AegisAuth,
  requireAuth: boolean
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (session) {
      context.actorId = session.user.id;
      context.session = session;

      // Active organization = Aegis tenant context
      if (session.session.activeOrganizationId) {
        context.tenantId = session.session.activeOrganizationId;
      }
    }
  } catch {
    // Session resolution failed — treat as unauthenticated
  }

  if (requireAuth && !context.actorId) {
    throw new ApiError(
      "UNAUTHORIZED",
      "Authentication is required for this operation.",
      401
    );
  }
};
