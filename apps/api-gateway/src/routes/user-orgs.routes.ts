/**
 * User Organization Routes — User-Scoped (no tenant context)
 *
 * Replicates better-auth organization.list() with direct Drizzle queries.
 * These routes are user-scoped: the authenticated user sees only their own
 * organizations (via baMember join) and can activate/deactivate an org session.
 *
 * Auth tables used:
 *   - baOrganization (id, name, slug, logo, createdAt, metadata)
 *   - baMember (organizationId, userId, role)
 *   - baSession (activeOrganizationId, userId)
 */
import { eq, and } from "drizzle-orm";
import { baOrganization, baMember, baSession } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, routeParam, parseJson } from "../http";
import type { DbClient } from "../adapters/db";
import { z } from "zod";
import { provisionOrganizationContext } from "../adapters/tenant-mapping";

/**
 * Type-safe accessor for the raw Drizzle DB client on deps._db.
 * The field is typed as `unknown` in AppDependencies to avoid coupling
 * the core type to Drizzle internals. This accessor narrows it safely.
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

      // Join baMember → baOrganization where userId matches the authenticated user
      const rows = await db
        .select({
          id: baOrganization.id,
          name: baOrganization.name,
          slug: baOrganization.slug,
          logo: baOrganization.logo,
          createdAt: baOrganization.createdAt,
          metadata: baOrganization.metadata,
          role: baMember.role,
        })
        .from(baMember)
        .innerJoin(baOrganization, eq(baMember.organizationId, baOrganization.id))
        .where(eq(baMember.userId, userId));

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

      const organizationId = routeParam(context.params, "organizationId");
      const db = getDb(context.deps);

      // Verify the user is actually a member of this organization
      const [membership] = await db
        .select({ id: baMember.id })
        .from(baMember)
        .where(
          and(
            eq(baMember.userId, userId),
            eq(baMember.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!membership) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403
        );
      }

      // Update ALL sessions for this user to set activeOrganizationId.
      // This ensures consistency across tabs/devices. The session ID is
      // available via context.session.session.id but updating all sessions
      // is safer for multi-device scenarios.
      await db
        .update(baSession)
        .set({ activeOrganizationId: organizationId })
        .where(eq(baSession.userId, userId));

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

      const organizationId = routeParam(context.params, "organizationId");
      const db = getDb(context.deps);

      // Verify the user is actually a member of this organization
      const [membership] = await db
        .select({ id: baMember.id })
        .from(baMember)
        .where(
          and(
            eq(baMember.userId, userId),
            eq(baMember.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!membership) {
        throw new ApiError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403
        );
      }

      // Clear activeOrganizationId on ALL sessions for this user
      await db
        .update(baSession)
        .set({ activeOrganizationId: null })
        .where(eq(baSession.userId, userId));

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

      // ── Platform-admin-only enforcement ────────────────────────────────
      // Regular users cannot create organizations. A platform admin assigns
      // users to organizations during the approval workflow.
      if (!isPlatformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Organization creation is restricted to platform administrators. Contact your administrator to be assigned to an organization.",
          403
        );
      }

      const body = await parseJson(context.request, z.object({
        name: z.string().min(1),
        slug: z.string().min(2)
      }));

      const db = getDb(context.deps);

      // ── One-org-per-user enforcement ──────────────────────────────────
      // Non-platform-admin users may only belong to a single organization.
      // This check uses the Standard domain memberships table.
      if (!isPlatformAdmin) {
        const existingCount = await context.deps.members.countActiveOrgsByUser(
          // countActiveOrgsByUser expects the Standard domain user UUID.
          // context.actorId is set by auth.middleware to the resolved Standard UUID.
          context.actorId ?? userId
        );
        if (existingCount > 0) {
          throw new ApiError(
            "SINGLE_ORG_LIMIT",
            "Non-admin users may only belong to one organization. Leave your current organization before creating a new one.",
            409,
            [{ reason: "single_org_limit", current_membership_count: existingCount }]
          );
        }
      }

      // Create the organization in Standard Native Auth (baOrganization)
      const orgId = crypto.randomUUID();
      const [newOrg] = await db
        .insert(baOrganization)
        .values({
          id: orgId,
          name: body.name,
          slug: body.slug,
          createdAt: new Date()
        })
        .returning();

      // Create the membership in baMember
      await db
        .insert(baMember)
        .values({
          id: crypto.randomUUID(),
          organizationId: orgId,
          userId: userId,
          role: "owner",
          createdAt: new Date()
        });

      // Provision the Standard domain tenant and organization for this new org.
      await provisionOrganizationContext(db, orgId);

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
