/**
 * @module scope.middleware
 * @description Enforces M2M API key scopes on protected routes.
 *
 * Only active for M2M requests (actorId === "m2m-agent").
 * Interactive sessions bypass scope checks (they use RBAC instead).
 *
 * Keys with no scopes (empty array) have wildcard access for backward compatibility.
 */
import { hasRequiredScopes, getRequiredScopesForRoute, type M2mScope } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

/**
 * Assert that the M2M API key has sufficient scopes for the matched route.
 */
export const assertApiKeyScopes = (
  context: RequestContext,
  routePath: string,
  method: string,
  authRequired: boolean
): void => {
  // Only enforce for M2M agents (actorId begins with m2m:)
  if (!context.actorId?.startsWith("m2m:")) return;

  // Wildcard keys (empty scopes array) bypass all scope checks
  if (Array.isArray(context.m2mScopes) && context.m2mScopes.length === 0) return;

  const requiredScopes = getRequiredScopesForRoute(method, routePath);

  // Protected route with no mapped scopes = fail closed for M2M
  if (requiredScopes.length === 0) {
    if (authRequired) {
      throw new ApiError(
        "INSUFFICIENT_SCOPE",
        `This route is protected but has no API key scopes configured. Access denied for machine-to-machine actors.`,
        403
      );
    }
    return;
  }

  if (!hasRequiredScopes(context.m2mScopes as M2mScope[] | undefined, requiredScopes)) {
    throw new ApiError(
      "INSUFFICIENT_SCOPE",
      `This API key lacks the required scope(s): ${requiredScopes.join(", ")}. ` +
      `Key has: ${context.m2mScopes?.length ? context.m2mScopes.join(", ") : "none"}. ` +
      `Create a new key with the necessary scopes or use a wildcard key.`,
      403
    );
  }
};

