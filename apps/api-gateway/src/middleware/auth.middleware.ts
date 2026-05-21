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

    // Interactive Session (Better Auth cookie-based session)
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (session?.user) {
      // Enforce JWT Blacklisting from Edge Cache (Revocation Check)
      if (context.env?.STANDARD_CACHE) {
        const isRevoked = await context.env.STANDARD_CACHE.get(`revocations:user:${session.user.id}`);
        if (isRevoked) {
          throw new ApiError("UNAUTHORIZED", "Token has been revoked.", 401);
        }
      }

      context.actorId = session.user.id;
      
      // Restore context.session so RBAC and Audit middlewares remain healthy
      context.session = {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: (session.user as any).role || "viewer"
        },
        session: {
          id: session.session.id,
          activeOrganizationId: (session.session as any).activeOrganizationId
        }
      };
      
      // Better Auth organization plugin stores active org in session
      const activeOrgId = (session.session as any).activeOrganizationId;
      if (activeOrgId) {
        context.tenantId = activeOrgId;
        context.organizationId = activeOrgId;
      }
    }
  } catch (err) {
    // Session resolution failed — log and treat as unauthenticated
    if (err instanceof ApiError) throw err; // Re-throw intentional ApiErrors (revocation)
    console.warn("[standard:auth] Session resolution failed:", err instanceof Error ? err.message : err);
  }

  if (requireAuth && !context.actorId) {
    const ip = context.request.headers.get("cf-connecting-ip") ?? context.request.headers.get("x-forwarded-for") ?? "unknown_ip";
    
    if (context.deps.SOC_TRIAGE_QUEUE) {
      // Best-effort context for the Incident Triager
      const userAgent = context.request.headers.get("user-agent") ?? "unknown";
      const authHeaderSize = context.request.headers.get("Authorization")?.length ?? 0;
      
      const sendOp = context.deps.SOC_TRIAGE_QUEUE.send({
        job_id: crypto.randomUUID(),
        tenantId: "system",
        traceId: context.traceId,
        systemModuleName: "API Gateway - Identity Service",
        rawLogsExcerpt: `[Auth Rejection] Access denied to protected route.\nIP: ${ip}\nUser-Agent: ${userAgent}\nAuth Header Size: ${authHeaderSize} bytes\nAction: HTTP 401 Unauthorized triggered. Possible credential stuffing, expired session, or unauthenticated probing.`
      }).catch(err => {
        console.error("[standard:auth] Failed to queue SOC event. Attempting DLQ...", err);
      });

      if (context.execCtx?.waitUntil) {
        context.execCtx.waitUntil(sendOp);
      }
    }

    throw new ApiError(
      "UNAUTHORIZED",
      "Authentication is required for this operation.",
      401
    );
  }
};
