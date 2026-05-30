/**
 * Admin User Management Routes — PLATFORM ADMIN ONLY.
 *
 * Queries better-auth tables (baUser, baSession, baAccount) directly via
 * Drizzle, replacing the better-auth admin plugin.
 *
 * All routes require the `platform_admin` flag on the authenticated user.
 * These are cross-tenant operations — no tenant_id scoping required.
 *
 * The raw Drizzle DB client is accessed via `context.deps._db`, which is
 * an internal escape hatch. Domain-scoped data should always use proper
 * repository adapters.
 */
import { z } from "zod";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { baUser, baSession, baAccount } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json, parseJson, routeParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";
import type { DbClient } from "../adapters/db";

// ── Helpers ────────────────────────────────────────────────────────────

/** Safely extract the raw Drizzle client from deps or throw 500. */
const getDb = (context: RequestContext): DbClient => {
  const db = context.deps._db;
  if (!db) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Database client not available for admin operations.",
      500,
    );
  }
  return db as DbClient;
};

/** Zod schema for query-string parsing on the list endpoint. */
const ListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});

/** Zod schema for the PATCH body. */
const UpdateUserBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(50).optional(),
}).refine((d) => d.name || d.role, {
  message: "At least one of 'name' or 'role' must be provided.",
});

/** Zod schema for the ban body. */
const BanUserBodySchema = z.object({
  reason: z.string().max(500).optional(),
  banExpires: z.coerce.date().optional(),
});

/** Columns selected from baUser — avoids leaking internal metadata. */
const userColumns = {
  id: baUser.id,
  name: baUser.name,
  email: baUser.email,
  emailVerified: baUser.emailVerified,
  image: baUser.image,
  role: baUser.role,
  banned: baUser.banned,
  banReason: baUser.banReason,
  banExpires: baUser.banExpires,
  platformAdmin: baUser.platformAdmin,
  jobTitle: baUser.jobTitle,
  phone: baUser.phone,
  createdAt: baUser.createdAt,
  updatedAt: baUser.updatedAt,
} as const;

// ── Route definitions ──────────────────────────────────────────────────

export const adminUsersRoutes: RouteDefinition[] = [
  // ── GET /api/v1/admin/users ──────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/admin/users",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const url = new URL(context.request.url);
      const query = ListUsersQuerySchema.parse({
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
      });

      const conditions = query.search
        ? or(
            ilike(baUser.name, `%${query.search}%`),
            ilike(baUser.email, `%${query.search}%`),
          )
        : undefined;

      const [users, countResult] = await Promise.all([
        db
          .select(userColumns)
          .from(baUser)
          .where(conditions)
          .orderBy(desc(baUser.createdAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(baUser)
          .where(conditions),
      ]);

      return json({
        data: users,
        total: countResult[0]?.count ?? 0,
        limit: query.limit,
        offset: query.offset,
        trace_id: context.traceId,
      });
    },
  },

  // ── PATCH /api/v1/admin/users/:userId ─────────────────────────────────
  {
    method: "PATCH",
    path: "/api/v1/admin/users/:userId",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, UpdateUserBodySchema);

      // Verify user exists
      const [existing] = await db
        .select({ id: baUser.id })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      const patch: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (body.name) patch.name = body.name;
      if (body.role) patch.role = body.role;

      const [updated] = await db
        .update(baUser)
        .set(patch)
        .where(eq(baUser.id, userId))
        .returning(userColumns);

      await context.deps.audit.record("admin.user.updated", {
        actor_id: context.actorId,
        target_user_id: userId,
        changes: { name: body.name, role: body.role },
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/ban ──────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/ban",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, BanUserBodySchema);

      // Verify user exists
      const [existing] = await db
        .select({ id: baUser.id, platformAdmin: baUser.platformAdmin })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      // Prevent banning other platform admins — safety net.
      if (existing.platformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot ban a platform admin. Remove platform_admin flag first.",
          403,
        );
      }

      const [updated] = await db
        .update(baUser)
        .set({
          banned: true,
          banReason: body.reason ?? null,
          banExpires: body.banExpires ?? null,
          updatedAt: new Date(),
        })
        .where(eq(baUser.id, userId))
        .returning(userColumns);

      // Invalidate all active sessions for the banned user
      await db
        .delete(baSession)
        .where(eq(baSession.userId, userId));

      await context.deps.audit.record("admin.user.banned", {
        actor_id: context.actorId,
        target_user_id: userId,
        reason: body.reason ?? "no reason provided",
        ban_expires: body.banExpires?.toISOString() ?? "permanent",
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/unban ────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/unban",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");

      // Verify user exists
      const [existing] = await db
        .select({ id: baUser.id })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      const [updated] = await db
        .update(baUser)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(baUser.id, userId))
        .returning(userColumns);

      await context.deps.audit.record("admin.user.unbanned", {
        actor_id: context.actorId,
        target_user_id: userId,
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── DELETE /api/v1/admin/users/:userId ─────────────────────────────────
  {
    method: "DELETE",
    path: "/api/v1/admin/users/:userId",
    protected: true,
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");

      // Verify user exists
      const [existing] = await db
        .select({ id: baUser.id, email: baUser.email, platformAdmin: baUser.platformAdmin })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      // Prevent deleting platform admins — catastrophic safety net.
      if (existing.platformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot delete a platform admin. Remove platform_admin flag first.",
          403,
        );
      }

      // Prevent self-deletion
      if (userId === context.actorId) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot delete your own account via admin API.",
          403,
        );
      }

      // Cascade delete: accounts → sessions → user
      // baSession and baAccount have ON DELETE CASCADE, but be explicit for auditability.
      await db.delete(baAccount).where(eq(baAccount.userId, userId));
      await db.delete(baSession).where(eq(baSession.userId, userId));
      await db.delete(baUser).where(eq(baUser.id, userId));

      await context.deps.audit.record("admin.user.deleted", {
        actor_id: context.actorId,
        target_user_id: userId,
        target_email: existing.email,
        trace_id: context.traceId,
      });

      return new Response(null, {
        status: 204,
        headers: { "x-trace-id": context.traceId },
      });
    },
  },
];
