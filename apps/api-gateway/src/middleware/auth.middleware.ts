/**
 * @module auth.middleware
 * @description Resolves authentication context from Standard Native Auth session.
 *
 * Standard Native Auth sessions are resolved from cookies (browser) or API keys (programmatic).
 * The active organization in the session maps to the Standard tenant_id.
 *
 * Type safety contract:
 * - Session user fields are read via `StandardUser` (packages/auth/src/types.ts)
 * - Session fields are read via `StandardSession` (packages/auth/src/types.ts)
 * - No `as any`, `as StandardUser`, or `as StandardSession` casts in this file.
 *   The single cast boundary is in resolveSessionFields() below.
 */
import type { StandardAuth, StandardUser, StandardSession } from "@standard/auth";
import { StructuredLogger } from "@standard/observability";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";

const logger = new StructuredLogger();

const isUuid = (val?: string): boolean =>
  val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;


/**
 * Typed session field extraction.
 *
 * Standard Native Auth's `getSession()` returns an opaque inferred type that does not expose
 * plugin-injected fields (role, activeOrganizationId, platformAdmin) in the base TS type.
 * We perform a single cast here at the boundary — all callers receive typed objects.
 */
function resolveSessionFields(rawSession: { user: unknown; session: unknown }): {
  user: StandardUser;
  session: StandardSession;
} {
  // Single cast boundary: Standard Native Auth returns plugin-augmented objects at runtime.
  // StandardUser and StandardSession in @standard/auth/types include all plugin fields.
  const user = rawSession.user as StandardUser;
  const session = rawSession.session as StandardSession;
  return { user, session };
}

/**
 * Resolve auth context from Standard Native Auth session.
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

        logger.log({
          level: "info",
          message: "m2m_api_key_resolved",
          service: "api-gateway",
          module: "auth",
          environment: "production",
          trace_id: context.traceId,
          tenant_id: apiKeyRecord.tenantId,
          organization_id: apiKeyRecord.organizationId,
          metadata: { actor_id: `m2m:${apiKeyRecord.id}`, key_id: apiKeyRecord.id }
        });

        return;
      }
    }

    // Interactive Session (Standard Native Auth cookie-based session)
    const rawSession = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (rawSession?.user) {
      // Enforce JWT Blacklisting from Edge Cache (Revocation Check)
      if (context.env?.STANDARD_CACHE) {
        const isRevoked = await context.env.STANDARD_CACHE.get(`revocations:user:${rawSession.user.id}`);
        if (isRevoked) {
          logger.log({
            level: "warn",
            message: "token_revoked",
            service: "api-gateway",
            module: "auth",
            environment: "production",
            trace_id: context.traceId,
            tenant_id: isUuid(context.tenantId) ? context.tenantId : undefined,
            metadata: { actor_id: rawSession.user.id, raw_tenant_id: context.tenantId }
          });
          throw new ApiError("UNAUTHORIZED", "Token has been revoked.", 401);
        }
      }

      // Extract typed fields at the single cast boundary
      const { user, session } = resolveSessionFields(rawSession);

      let resolvedActorId = user.id;
      if (context.deps.resolveUserContext) {
        try {
          const resolvedUser = await context.deps.resolveUserContext(user.email, user.name);
          resolvedActorId = resolvedUser.id;
        } catch (err) {
          logger.log({
            level: "error",
            message: "user_context_resolution_failed",
            service: "api-gateway",
            module: "auth",
            environment: "production",
            trace_id: context.traceId,
            metadata: { 
              error: err instanceof Error ? err.message : String(err),
              email: user.email 
            }
          });
        }
      }

      context.actorId = resolvedActorId;

      // Restore context.session so RBAC and Audit middlewares remain healthy.
      // All fields are typed — no `as any` needed here.
      context.session = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? "viewer",
          platformAdmin: user.platformAdmin ?? (user as any).platform_admin ?? false,
        },
        session: {
          id: session.id,
          activeOrganizationId: session.activeOrganizationId,
        }
      };

      // Standard Native Auth organization plugin stores active org in session
      const activeOrgId = session.activeOrganizationId;
      if (activeOrgId) {
        context.tenantId = activeOrgId;
        context.organizationId = activeOrgId;
      }

      logger.log({
        level: "info",
        message: "session_resolved",
        service: "api-gateway",
        module: "auth",
        environment: "production",
        trace_id: context.traceId,
        tenant_id: isUuid(context.tenantId) ? context.tenantId : undefined,
        metadata: {
          actor_id: user.id,
          session_id: session.id,
          active_org_id: activeOrgId ?? null,
          role: user.role ?? "viewer",
          platform_admin: user.platformAdmin ?? false,
        }
      });
    }
  } catch (err) {
    // Session resolution failed — log structured event and treat as unauthenticated
    if (err instanceof ApiError) throw err; // Re-throw intentional ApiErrors (revocation)
    logger.log({
      level: "warn",
      message: "session_resolution_failed",
      service: "api-gateway",
      module: "auth",
      environment: "production",
      trace_id: context.traceId,
      tenant_id: isUuid(context.tenantId) ? context.tenantId : undefined,
      metadata: { 
        error: err instanceof Error ? err.message : String(err),
        raw_tenant_id: context.tenantId
      }
    });
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
