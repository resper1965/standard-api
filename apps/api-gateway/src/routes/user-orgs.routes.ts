/**
 * User Organization Routes — User-Scoped (no tenant context)
 *
 * Replicates better-auth organization.list() with direct Drizzle queries.
 * These routes are user-scoped: the authenticated user sees only their own
 * organizations.
 */
import { eq, and } from "drizzle-orm";
import { organizations, baSession } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, routeUuidParam, parseJson } from "../http";
import type { DbClient } from "../adapters/db";
import { z } from "zod";

/**
 * Type-safe accessor for the raw Drizzle DB client on deps._db.
 */
const getDb = (deps: { _db?: unknown }): DbClient => {
  if (!deps._db) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Database client is not available. This route requires a Drizzle DB connection.",
      500
    );
  }
  return deps._db as DbClient;
};

export const userOrgsRoutes: RouteDefinition[] = [
  // ── GET /api/v1/users/me/organizations ──────────────────────────────
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

      const db = getDb(context.deps);

      // Direct SQL select to organizations to return the orgs that belong to the user
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
        { headers: { "x-trace-id": context.traceId } }
      );
    },
  },

  // ── POST /api/v1/users/me/organizations/:organizationId/activate ────
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
      const db = getDb(context.deps);

      // Verify the user owns this organization
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(
          and(
            eq(organizations.userId, userId),
            eq(organizations.id, organizationId)
          )
        )
        .limit(1);

      if (!org) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403
        );
      }

      // activeOrganizationId is deprecated in API-first approach
      // session update is skipped.

      // Audit the activation
      await context.deps.audit.record("user_org.activated", {
        actor_id: userId,
        organization_id: organizationId,
        trace_id: context.traceId,
      });

      return json(
        {
          ok: true,
          active_organization_id: organizationId,
          trace_id: context.traceId,
        },
        { headers: { "x-trace-id": context.traceId } }
      );
    },
  },

  // ── POST /api/v1/users/me/organizations/:organizationId/deactivate ──
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
      const db = getDb(context.deps);

      // Verify the user owns this organization
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(
          and(
            eq(organizations.userId, userId),
            eq(organizations.id, organizationId)
          )
        )
        .limit(1);

      if (!org) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403
        );
      }

      // activeOrganizationId is deprecated in API-first approach
      // session update is skipped.

      // Audit the deactivation
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
        { headers: { "x-trace-id": context.traceId } }
      );
    },
  },
  
  // ── POST /api/v1/users/me/organizations ─────────────────────────────
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

      const isPlatformAdmin =
        context.session?.user?.platformAdmin === true ||
        (context.session?.user as any)?.platform_admin === true;

      if (!isPlatformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Organization creation is restricted to platform administrators.",
          403
        );
      }

      const body = await parseJson(context.request, z.object({
        name: z.string().min(1),
        slug: z.string().min(2)
      }));

      const db = getDb(context.deps);

      // Create the organization in the domain table
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

      // Audit the creation
      await context.deps.audit.record("user_org.created", {
        actor_id: userId,
        organization_id: orgId,
        trace_id: context.traceId,
      });

      return json(
        {
          organization_id: orgId,
          name: newOrg!.name,
          slug: newOrg!.slug,
          trace_id: context.traceId
        },
        { status: 201, headers: { "x-trace-id": context.traceId } }
      );
    }
  }
];
