/**
 * User Organization Routes — User-Scoped (no tenant context)
 *
 * Simplified auth model: 1 user = 1 org (organizations.userId === baUser.id).
 * No memberships table — ownership verified directly on organizations.userId.
 *
 * Auth simplification: replaced memberships+users join with direct userId lookup (A7).
 */
import { eq } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json, routeUuidParam, parseJson } from "../http";
import type { AuthRepository } from "@standard/auth";
import type { DbClient } from "../adapters/db";
import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely extract AuthRepository from deps or throw 500. */
const getRepo = (context: RequestContext): AuthRepository => {
  const repo = context.deps.authRepo;
  if (!repo) {
    throw new ApiError("INTERNAL_ERROR", "AuthRepository not available.", 500);
  }
  return repo;
};

/** Domain DB accessor — for the organizations table. */
const getDomainDb = (context: RequestContext): DbClient => {
  if (!context.deps._db) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Database client is not available.",
      500,
    );
  }
  return context.deps._db as DbClient;
};

export const userOrgsRoutes: RouteDefinition[] = [
  // ── GET /api/v1/users/me ─────────────────────────────────────────────────────
  // Returns the current user's profile with platformAdmin and approved flags.
  // The frontend reads platformAdmin from here (not from the Better Auth session
  // proxy, which coerces boolean additionalFields to undefined).
  {
    method: "GET",
    path: "/api/v1/users/me",
    protected: true,
    permissions: [],
    tenantRequired: false,
    handler: async (context) => {
      const user = context.session?.user;
      if (!user) {
        throw new ApiError("UNAUTHORIZED", "Session required.", 401);
      }
      return json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          platformAdmin: user.platformAdmin,
          approved: user.approved,
        },
      });
    },
  },

  // ── GET /api/v1/users/me/organizations ──────────────────────────────────────

  {
    method: "GET",
    path: "/api/v1/users/me/organizations",
    protected: true,
    permissions: ["organization:read"],
    tenantRequired: false,
    handler: async (context) => {
      const userId = context.session?.user?.id;
      if (!userId) {
        throw new ApiError("UNAUTHORIZED", "Session required.", 401);
      }

      const db = getDomainDb(context);

      // 1:1 model — each user owns exactly one org (organizations.userId = baUser.id)
      const rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          status: organizations.status,
          billingTier: organizations.billingTier,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(eq(organizations.userId, userId));

      return json(
        { data: rows, trace_id: context.traceId },
        { headers: { "x-trace-id": context.traceId } },
      );
    },
  },

  // ── POST /api/v1/users/me/organizations/:organizationId/activate ─────────────
  {
    method: "POST",
    path: "/api/v1/users/me/organizations/:organizationId/activate",
    protected: true,
    permissions: ["organization:create"],
    tenantRequired: false,
    handler: async (context) => {
      try {
        const userId = context.session?.user?.id;
        if (!userId) {
          throw new ApiError("UNAUTHORIZED", "Session required.", 401);
        }

        const organizationId = routeUuidParam(context.params, "organizationId");
        const db = getDomainDb(context);
        const repo = getRepo(context);

        console.log(
          "[standard:activate] Starting activation. User:",
          userId,
          "Org:",
          organizationId,
        );

        // Verify the user owns this organization (1:1 model)
        const [org] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.userId, userId))
          .limit(1);

        if (!org || org.id !== organizationId) {
          console.warn(
            "[standard:activate] Ownership check failed. User owns org:",
            org?.id,
          );
          throw new ApiError(
            "FORBIDDEN",
            "You are not the owner of this organization.",
            403,
          );
        }

        // H4 fix: Set active organization on session. We no longer revoke the session
        // to avoid infinite login loops, since new sessions start with activeOrganizationId = null.
        const sessionId = context.session?.session?.id;
        if (sessionId) {
          console.log(
            "[standard:activate] Setting session org:",
            sessionId,
            "to org:",
            organizationId,
          );
          await repo.setSessionOrg(sessionId, organizationId);

          // Bust the session-ctx KV cache
          if (context.env?.STANDARD_CACHE) {
            await context.env.STANDARD_CACHE.delete(
              `session-ctx:${sessionId}`,
            ).catch(() => {});
          }
        }

        // Soft revocation — clears downstream caches, does NOT cause 401
        if (context.env?.STANDARD_CACHE) {
          await context.env.STANDARD_CACHE.put(
            `revocations:user:${userId}`,
            "org_switch",
            { expirationTtl: 10 },
          ).catch(() => {});
        }

        await context.deps.audit.record("user_org.activated", {
          actor_id: userId,
          organization_id: organizationId,
          session_rotated: false,
          trace_id: context.traceId,
        });

        return json(
          {
            ok: true,
            active_organization_id: organizationId,
            session_rotated: false,
            trace_id: context.traceId,
          },
          { status: 200, headers: { "x-trace-id": context.traceId } },
        );
      } catch (err: any) {
        console.error("[standard:activate:error]", err);
        return json(
          {
            error: "ACTIVATE_FAILED",
            message: err.message || String(err),
            stack: err.stack,
            trace_id: context.traceId,
          },
          { status: 500, headers: { "x-trace-id": context.traceId } },
        );
      }
    },
  },

  // ── POST /api/v1/users/me/organizations/:organizationId/deactivate ───────────
  {
    method: "POST",
    path: "/api/v1/users/me/organizations/:organizationId/deactivate",
    protected: true,
    permissions: ["organization:create"],
    tenantRequired: false,
    handler: async (context) => {
      const userId = context.session?.user?.id;
      if (!userId) {
        throw new ApiError("UNAUTHORIZED", "Session required.", 401);
      }

      const organizationId = routeUuidParam(context.params, "organizationId");
      const db = getDomainDb(context);
      const repo = getRepo(context);

      // Verify the user owns this organization (1:1 model)
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.userId, userId))
        .limit(1);

      if (!org || org.id !== organizationId) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not the owner of this organization.",
          403,
        );
      }

      // Clear activeOrganizationId from the ba_session via repo
      const sessionId = context.session?.session?.id;
      if (sessionId) {
        await repo.setSessionOrg(sessionId, null);

        if (context.env?.STANDARD_CACHE) {
          await context.env.STANDARD_CACHE.delete(
            `session-ctx:${sessionId}`,
          ).catch(() => {});
        }
      }

      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "org_deactivate",
          { expirationTtl: 10 },
        ).catch(() => {});
      }

      await context.deps.audit.record("user_org.deactivated", {
        actor_id: userId,
        organization_id: organizationId,
        trace_id: context.traceId,
      });

      return json(
        {
          ok: true,
          active_organization_id: null,
          trace_id: context.traceId,
        },
        { headers: { "x-trace-id": context.traceId } },
      );
    },
  },

  // ── POST /api/v1/users/me/organizations ─────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/users/me/organizations",
    protected: true,
    permissions: ["organization:create"],
    tenantRequired: false,
    handler: async (context) => {
      const userId = context.session?.user?.id;
      if (!userId) {
        throw new ApiError("UNAUTHORIZED", "Session required.", 401);
      }

      const isPlatformAdmin = context.session?.user?.platformAdmin === true;
      if (!isPlatformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Organization creation is restricted to platform administrators.",
          403,
        );
      }

      const body = await parseJson(
        context.request,
        z.object({
          name: z.string().min(1),
          slug: z.string().min(2),
        }),
      );

      const db = getDomainDb(context);

      const orgId = crypto.randomUUID();
      const [newOrg] = await db
        .insert(organizations)
        .values({
          id: orgId,
          name: body.name,
          slug: body.slug,
          userId: userId,
          status: "active",
        })
        .returning();

      if (!newOrg) {
        throw new ApiError(
          "CONFLICT",
          "Organization creation failed — possible duplicate slug.",
          409,
        );
      }

      await context.deps.audit.record("user_org.created", {
        actor_id: userId,
        organization_id: orgId,
        trace_id: context.traceId,
      });

      return json(
        {
          organization_id: orgId,
          name: newOrg.name,
          slug: newOrg.slug,
          trace_id: context.traceId,
        },
        { status: 201, headers: { "x-trace-id": context.traceId } },
      );
    },
  },
];
