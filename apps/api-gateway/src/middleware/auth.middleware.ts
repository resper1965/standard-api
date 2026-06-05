/**
 * @module auth.middleware
 * @description Resolves authentication context from Standard Native Auth session.
 *
 * Standard Native Auth sessions are resolved from cookies (browser) or API keys (programmatic).
 * The active organization in the session maps to the Standard organization_id.
 *
 * Type safety contract:
 * - Session user fields are read via `StandardUser` (packages/auth/src/types.ts)
 * - Session fields are read via `StandardSession` (packages/auth/src/types.ts)
 * - No `as any`, `as StandardUser`, or `as StandardSession` casts in this file.
 *   The single cast boundary is in resolveSessionFields() below.
 */
import type { StandardAuth, StandardUser, StandardSession } from "@standard/auth";
import { StructuredLogger } from "@standard/observability";
import { baSession } from "@standard/schemas";
import { eq } from "drizzle-orm";
import { ApiError } from "../errors/api-error";
import type { RequestContext } from "../http";
import type { DbClient } from "../adapters/db";

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
 * Sets `context.actorId`, `context.organizationId`, and `context.session`.
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
        context.organizationId = apiKeyRecord.organizationId;
        context.organizationId = apiKeyRecord.organizationId; // organization_id === organization_id (ADR 0002 Phase 2/3)

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
            organization_id: isUuid(context.organizationId) ? context.organizationId : undefined,
            metadata: { actor_id: rawSession.user.id, raw_tenant_id: context.organizationId }
          });
          throw new ApiError("UNAUTHORIZED", "Token has been revoked.", 401);
        }
      }

      // Extract typed fields at the single cast boundary
      const { user, session } = resolveSessionFields(rawSession);

      // ── Approval gate ──────────────────────────────────────────────────────
      // New users are created with approved=false. Block access until a
      // platform admin approves the account. Platform admins themselves
      // are always allowed through.
      const isPlatformAdminUser = user.platformAdmin === true || user.platform_admin === true;
      if (user.approved === false && !isPlatformAdminUser) {
        logger.log({
          level: "warn",
          message: "account_pending_approval",
          service: "api-gateway",
          module: "auth",
          environment: "production",
          trace_id: context.traceId,
          metadata: { actor_id: user.id, email: user.email },
        });
        throw new ApiError(
          "ACCOUNT_PENDING_APPROVAL",
          "Your account is pending approval by a platform administrator.",
          403
        );
      }

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
          platformAdmin: user.platformAdmin ?? user.platform_admin ?? false,
          approved: user.approved ?? false,
        },
        session: {
          id: session.id,
          activeOrganizationId: session.activeOrganizationId,
        }
      };

      // ── Organization context resolution ───────────────────────────────────────
      // Standard Native Auth stores the active org in the session.
      // ALL users (including platform admins) must be scoped to an organization.
      let activeOrgId = session.activeOrganizationId;
      // isPlatformAdminUser already computed above for the approval gate

      // Better Auth omits activeOrganizationId from the getSession() response
      // when the `organization` plugin is not enabled server-side. The value
      // exists in the DB column but is never serialized. Read it directly as a
      // fallback so the org context chain is never broken.
      if (!activeOrgId && context.deps._db && session.id) {
        try {
          const db = context.deps._db as DbClient;
          const [row] = await db
            .select({ activeOrganizationId: baSession.activeOrganizationId })
            .from(baSession)
            .where(eq(baSession.id, session.id))
            .limit(1);
          if (row?.activeOrganizationId) {
            activeOrgId = row.activeOrganizationId;
            console.log(
              `[standard:auth] DB fallback resolved activeOrganizationId="${activeOrgId}" for session="${session.id}"`
            );
          } else {
            console.warn(
              `[standard:auth] DB fallback: no activeOrganizationId in session table for session="${session.id}"`
            );
          }
        } catch (e) {
          logger.log({
            level: "warn",
            message: "session_active_org_db_fallback_failed",
            service: "api-gateway",
            module: "auth",
            environment: "production",
            trace_id: context.traceId,
            metadata: { error: e instanceof Error ? e.message : String(e), session_id: session.id },
          });
        }
      } else if (activeOrgId) {
        console.log(
          `[standard:auth] session.activeOrganizationId="${activeOrgId}" (from BA getSession)`
        );
      } else {
        console.warn(
          `[standard:auth] No activeOrganizationId: session.id="${session.id}", _db=${!!context.deps._db}`
        );
      }

      let resolvedOrgId: string | undefined = activeOrgId ?? undefined;

      if (!resolvedOrgId && isPlatformAdminUser) {
        // Platform admin without an active org → auto-scope to the Bekaa operator org.
        // The slug is driven by PLATFORM_ADMIN_ORG_SLUG env var (default: "bekaa").
        const platformOrgSlug = context.env?.PLATFORM_ADMIN_ORG_SLUG ?? "bekaa";

        // Resolve slug → real BA org UUID so we can persist it to the session
        let bekaaOrgId: string = platformOrgSlug; // fallback: use slug if DB unavailable
        if (context.deps._db) {
          try {
            const db = context.deps._db as DbClient;
            const { baOrganization } = await import("@standard/schemas");
            const [bekaaOrg] = await db
              .select({ id: baOrganization.id })
              .from(baOrganization)
              .where(eq(baOrganization.slug, platformOrgSlug))
              .limit(1);
            if (bekaaOrg) {
              bekaaOrgId = bekaaOrg.id;
              // Persist activeOrganizationId to the BA session so getSession()
              // returns it immediately on the next frontend call — stops the flicker.
              await db
                .update(baSession)
                .set({ activeOrganizationId: bekaaOrgId })
                .where(eq(baSession.id, session.id));
            }
          } catch (e) {
            logger.log({
              level: "warn",
              message: "platform_admin_session_persist_failed",
              service: "api-gateway",
              module: "auth",
              environment: "production",
              trace_id: context.traceId,
              metadata: { error: e instanceof Error ? e.message : String(e) },
            });
          }
        }

        resolvedOrgId = platformOrgSlug; // use slug for domain resolution — bekaaOrgId is BA-internal only

        logger.log({
          level: "info",
          message: "platform_admin_org_auto_scoped",
          service: "api-gateway",
          module: "auth",
          environment: "production",
          trace_id: context.traceId,
          metadata: {
            actor_id: user.id,
            platform_org_slug: platformOrgSlug,
            bekaa_org_id: bekaaOrgId,
          },
        });
      }

      if (resolvedOrgId) {
        context.organizationId = resolvedOrgId;

        // Resolve Better-Auth string ID / slug to database UUIDs (read-only).
        // If the org has not yet been provisioned in the domain tables, provision
        // it now: the ID comes from the authenticated BA session (the user's
        // active organization), so this is legitimate first-touch provisioning,
        // not arbitrary "phantom" creation.
        if (context.deps.resolveOrganizationContext) {
          try {
            let resolved = await context.deps.resolveOrganizationContext(resolvedOrgId);
            if (!resolved && context.deps.provisionOrganizationContext) {
              resolved = await context.deps.provisionOrganizationContext(resolvedOrgId);
            }
            if (resolved) {
              context.organizationId = resolved.organization_id;
            }
          } catch (e) {
            logger.log({
              level: "error",
              message: "auth_tenant_resolution_failed",
              service: "api-gateway",
              module: "auth",
              environment: "production",
              trace_id: context.traceId,
              metadata: {
                error: e instanceof Error ? e.message : String(e),
                resolved_org_id: resolvedOrgId,
              },
            });
            // CRITICAL: Clear tenant context to prevent raw BA org ID (nanoid)
            // from being used downstream as a domain UUID. Handlers should
            // treat this as "no org context" and re-resolve or reject.
            context.organizationId = undefined;
          }
        }
      } else {
        // No active organization and not a platform admin.
        // We do NOT throw here — the 403 is deferred to the `requireAuth` check
        // or to an explicit `requireOrganizationContext` guard so that public /auth
        // routes still work. We log a warning for observability.
        logger.log({
          level: "warn",
          message: "session_missing_organization",
          service: "api-gateway",
          module: "auth",
          environment: "production",
          trace_id: context.traceId,
          metadata: {
            actor_id: user.id,
            session_id: session.id,
            platform_admin: isPlatformAdminUser,
          },
        });
      }

      logger.log({
        level: "info",
        message: "session_resolved",
        service: "api-gateway",
        module: "auth",
        environment: "production",
        trace_id: context.traceId,
        organization_id: isUuid(context.organizationId) ? context.organizationId : undefined,
        metadata: {
          actor_id: user.id,
          session_id: session.id,
          active_org_id: resolvedOrgId ?? null,
          role: user.role ?? "viewer",
          platform_admin: isPlatformAdminUser,
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
      organization_id: isUuid(context.organizationId) ? context.organizationId : undefined,
      metadata: { 
        error: err instanceof Error ? err.message : String(err),
        raw_tenant_id: context.organizationId
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
        organizationId: "system",
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
