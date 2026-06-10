/**
 * User Organization Routes — User-Scoped (no tenant context)
 *
 * BA table access (baSession) is encapsulated in AuthRepository (ADR-009).
 * Domain table queries (organizations, memberships, users) use _db directly
 * as they are not Better Auth internal tables.
 */
import { eq, and, or } from "drizzle-orm";
import { organizations, memberships, users } from "@standard/schemas";
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

/**
 * Domain DB accessor — for organizations, memberships, users tables.
 * These are NOT Better Auth internals.
 */
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

      const rows = await db
        .selectDistinct({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          status: organizations.status,
          billingTier: organizations.billingTier,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .leftJoin(memberships, eq(organizations.id, memberships.organizationId))
        .leftJoin(users, eq(users.id, memberships.userId))
        .where(
          or(
            eq(organizations.userId, userId),
            eq(users.identityProviderSubject, userId),
          ),
        );

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
      const userId = context.session?.user?.id;
      if (!userId) {
        throw new ApiError("UNAUTHORIZED", "Session required.", 401);
      }

      const organizationId = routeUuidParam(context.params, "organizationId");
      const db = getDomainDb(context);
      const repo = getRepo(context);

      // Verify the user owns or is a member of this organization
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .leftJoin(memberships, eq(organizations.id, memberships.organizationId))
        .leftJoin(users, eq(users.id, memberships.userId))
        .where(
          and(
            eq(organizations.id, organizationId),
            or(
              eq(organizations.userId, userId),
              eq(users.identityProviderSubject, userId),
            ),
          ),
        )
        .limit(1);

      if (!org) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403,
        );
      }

      // H4 fix: Session rotation on privilege change.
      // Org switch changes the user's role context — invalidate old session
      // to prevent session fixation with stale role data.
      const sessionId = context.session?.session?.id;
      if (sessionId) {
        // Set org context, then delete session (forces re-auth with new context)
        await repo.setSessionOrg(sessionId, organizationId);
        await repo.revokeSession(sessionId);

        // Bust the customSession KV cache
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
        session_rotated: true,
        trace_id: context.traceId,
      });

      return json(
        {
          ok: true,
          active_organization_id: organizationId,
          // H4: Signal to frontend that re-authentication is required
          session_rotated: true,
          trace_id: context.traceId,
        },
        { status: 200, headers: { "x-trace-id": context.traceId } },
      );
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

      // Verify the user owns or is a member of this organization
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .leftJoin(memberships, eq(organizations.id, memberships.organizationId))
        .leftJoin(users, eq(users.id, memberships.userId))
        .where(
          and(
            eq(organizations.id, organizationId),
            or(
              eq(organizations.userId, userId),
              eq(users.identityProviderSubject, userId),
            ),
          ),
        )
        .limit(1);

      if (!org) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403,
        );
      }

      // Clear activeOrganizationId from the ba_session via repo
      const sessionId = context.session?.session?.id;
      if (sessionId) {
        await repo.setSessionOrg(sessionId, null);

        // Bust the customSession KV cache
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
