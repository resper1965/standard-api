/**
 * @module auth.middleware
 * @description Resolves authentication context from Better Auth session.
 *
 * Better Auth sessions are resolved from cookies (browser) or API keys (programmatic).
 * The active organization in the session maps to the Standard tenant_id.
 */
import type { StandardAuth } from "@standard/auth";
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
  auth: StandardAuth,
  requireAuth: boolean
): Promise<void> => {
  try {
    const authHeader = context.request.headers.get("Authorization");

    // Machine-to-Machine API Key
    if (authHeader && authHeader.startsWith("Bearer standard_live_")) {
      const token = authHeader.replace("Bearer ", "");
      
      // Hash the token using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const apiKeyRecord = await context.deps.apiKeys.verifyKey(keyHash);
      if (apiKeyRecord) {
        context.actorId = `m2m:${apiKeyRecord.id}`;
        context.tenantId = apiKeyRecord.tenantId;
        context.organizationId = apiKeyRecord.organizationId;
        
        // Store scopes for downstream scope enforcement middleware
        context.m2mScopes = apiKeyRecord.scopes;
        
        // Asynchronous update of last used time
        context.deps.apiKeys.markUsed(apiKeyRecord.id).catch((e) => {
          console.error("Failed to mark API key used", e);
        });
        
        return;
      }
    }

    // Interactive Session (Browser / Better Auth)
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (session) {
      context.actorId = session.user.id;
      context.session = session;

      // Active organization = Standard tenant context
      if (session.session.activeOrganizationId) {
        context.tenantId = session.session.activeOrganizationId;
        context.organizationId = session.session.activeOrganizationId;
      }
    }
  } catch (err) {
    // Session resolution failed — log and treat as unauthenticated
    console.warn("[standard:auth] Session resolution failed:", err instanceof Error ? err.message : err);
  }

  if (requireAuth && !context.actorId) {
    throw new ApiError(
      "UNAUTHORIZED",
      "Authentication is required for this operation.",
      401
    );
  }
};

