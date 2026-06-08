/**
 * Admin User Management Routes — PLATFORM ADMIN ONLY.
 *
 * Queries better-auth tables (baUser, baSession, baAccount) directly via
 * Drizzle, replacing the better-auth admin plugin.
 *
 * All routes require the `platform_admin` flag on the authenticated user.
 * These are cross-tenant operations — no organization_id scoping required.
 *
 * The raw Drizzle DB client is accessed via `context.deps._db`, which is
 * an internal escape hatch. Domain-scoped data should always use proper
 * repository adapters.
 */
import { z } from "zod";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { baUser, baSession, baAccount, organizations, memberships, users } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json, parseJson, routeParam, routeUuidParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";
import { sanitizeLikeInput } from "@standard/security";
import type { DbClient } from "../adapters/db";
import { resolveOrganizationContext } from "../adapters/tenant-mapping";

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
}).refine((d) => d.name, {
  message: "At least one of 'name' must be provided.",
});

/** Zod schema for the ban body. */
const BanUserBodySchema = z.object({
  reason: z.string().max(500).optional(),
  banExpires: z.coerce.date().optional(),
});

/** Zod schema for the approve body — organization assignment is mandatory. */
const ApproveUserBodySchema = z.object({
  organization_id: z.string().min(1, "organization_id is required to assign the user."),
  role: z.string().min(1).max(50).default("member"),
});

/** Columns selected from baUser — avoids leaking internal metadata. */
const userColumns = {
  id: baUser.id,
  name: baUser.name,
  email: baUser.email,
  emailVerified: baUser.emailVerified,
  image: baUser.image,
  banned: baUser.banned,
  banReason: baUser.banReason,
  banExpires: baUser.banExpires,
  platformAdmin: baUser.platformAdmin,
  approved: baUser.approved,
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
    permissions: ["admin:read"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const url = new URL(context.request.url);
      const query = ListUsersQuerySchema.parse({
        limit: url.searchParams.has("limit") ? Math.min(Number(url.searchParams.get("limit")), 100) : undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
      });

      const conditions = query.search
        ? or(
            ilike(baUser.name, `%${sanitizeLikeInput(query.search)}%`),
            ilike(baUser.email, `%${sanitizeLikeInput(query.search)}%`),
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

  // ── POST /api/v1/admin/users ──────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users",
    protected: true,
    permissions: ["admin:write"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const CreateUserBodySchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.string().default("user"),
      });

      const body = await parseJson(context.request, CreateUserBodySchema);

      // We dynamically import getCachedAuth here to avoid circular dependency loops if any,
      // or we can rely on standard baUser inserts. However, password hashing requires auth.
      const { getCachedAuth } = await import("../index-helpers");
      const auth = getCachedAuth();

      if (!auth) {
        throw new ApiError("INTERNAL_ERROR", "Auth instance not available", 500);
      }

      try {
        const res = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            metadata: "",
            jobTitle: "",
            phone: "",
          }
        });

        const db = getDb(context);
        
        // Auto-approve users created by platform admin and apply role
        const patch: Record<string, unknown> = {
          approved: true,
          updatedAt: new Date(),
        };
        if (body.role === "admin") {
          patch.platformAdmin = true;
        }

        const [updated] = await db.update(baUser)
          .set(patch)
          .where(eq(baUser.email, body.email))
          .returning(userColumns);

        await context.deps.audit.record("admin.user.created", {
          actor_id: context.actorId,
          target_email: body.email,
          role: body.role,
          trace_id: context.traceId,
        });

        return json({ data: updated || res.user, trace_id: context.traceId }, { status: 201 });
      } catch (err: any) {
        throw new ApiError("VALIDATION_ERROR", err.message || "Failed to create user", 400);
      }
    },
  },


  // ── PATCH /api/v1/admin/users/:userId ─────────────────────────────────
  {
    method: "PATCH",
    path: "/api/v1/admin/users/:userId",
    protected: true,
    permissions: ["admin:write"],
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

      const [updated] = await db
        .update(baUser)
        .set(patch)
        .where(eq(baUser.id, userId))
        .returning(userColumns);

      await context.deps.audit.record("admin.user.updated", {
        actor_id: context.actorId,
        target_user_id: userId,
        changes: { name: body.name },
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
    permissions: ["admin:create"],
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

      // Invalidate all active sessions for the banned user.
      // Non-critical: user is already banned, sessions will be rejected on
      // next auth check even if this cleanup fails.
      let sessionCleanupError: string | undefined;
      try {
        await db
          .delete(baSession)
          .where(eq(baSession.userId, userId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[admin:ban] Failed to delete sessions for user ${userId}:`, msg);
        sessionCleanupError = msg;
      }

      await context.deps.audit.record("admin.user.banned", {
        actor_id: context.actorId,
        target_user_id: userId,
        reason: body.reason ?? "no reason provided",
        ban_expires: body.banExpires?.toISOString() ?? "permanent",
        session_cleanup_error: sessionCleanupError,
        trace_id: context.traceId,
      });

      // Edge cache revocation — forces immediate rejection at the middleware
      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "user_banned",
          { expirationTtl: 86400 } // 24h
        ).catch(() => {});
      }

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/unban ────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/unban",
    protected: true,
    permissions: ["admin:create"],
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

  // ── POST /api/v1/admin/users/:userId/approve ──────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/approve",
    protected: true,
    permissions: ["admin:approve"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, ApproveUserBodySchema);

      // Verify user exists and is not already approved
      const [existing] = await db
        .select({ id: baUser.id, approved: baUser.approved, email: baUser.email, name: baUser.name })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }
      if (existing.approved) {
        return json({ data: { message: "User is already approved." }, trace_id: context.traceId });
      }

      // Verify the target organization exists
      const [org] = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, body.organization_id))
        .limit(1);
      if (!org) {
        throw new ApiError("NOT_FOUND", "Organization not found. Select a valid organization.", 404);
      }

      // 1. Mark user as approved
      const [updated] = await db
        .update(baUser)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(baUser.id, userId))
        .returning(userColumns);

      // 2. Upsert into domain users
      let domainUserId: string;
      const [existingDomainUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, existing.email))
        .limit(1);

      if (existingDomainUser) {
        domainUserId = existingDomainUser.id;
        await db.update(users).set({ identityProviderSubject: userId }).where(eq(users.id, domainUserId));
      } else {
        const [newDomainUser] = await db.insert(users).values({
          email: existing.email,
          displayName: existing.name || "User",
          identityProvider: "standard-native-auth",
          identityProviderSubject: userId,
        }).returning({ id: users.id });
        domainUserId = newDomainUser!.id;
      }

      // 3. Upsert into memberships
      const [existingMembership] = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.organizationId, body.organization_id), eq(memberships.userId, domainUserId)))
        .limit(1);

      if (!existingMembership) {
        await db.insert(memberships).values({
          organizationId: body.organization_id,
          userId: domainUserId,
          email: existing.email,
          displayName: existing.name,
          role: body.role ?? "member",
          status: "active",
          acceptedAt: new Date()
        });
      }

      await context.deps.audit.record("admin.user.approved", {
        actor_id: context.actorId,
        target_user_id: userId,
        organization_id: body.organization_id,
        assigned_role: body.role ?? "member",
        trace_id: context.traceId,
      });

      // Invalidate all sessions so the user re-authenticates with fresh
      // customSession data (new membership + org context).
      try {
        await db.delete(baSession).where(eq(baSession.userId, userId));
      } catch (err) {
        console.error(`[admin:approve] Session invalidation failed for ${userId}:`, err instanceof Error ? err.message : String(err));
      }
      // Edge cache soft revocation — clears downstream caches on next request.
      // The session DELETE above already forces re-authentication.
      // "membership_change" is a soft revocation (not 401) — see auth.middleware.ts.
      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "membership_change",
          { expirationTtl: 10 } // 10s — just enough to bust cached session data
        ).catch(() => {});
      }

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/reject ────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/reject",
    protected: true,
    permissions: ["admin:create"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const userId = routeParam(context.params, "userId");

      const [existing] = await db
        .select({ id: baUser.id, email: baUser.email, approved: baUser.approved, platformAdmin: baUser.platformAdmin })
        .from(baUser)
        .where(eq(baUser.id, userId))
        .limit(1);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }
      if (existing.platformAdmin) {
        throw new ApiError("FORBIDDEN", "Cannot reject a platform admin.", 403);
      }

      // Cascade delete the rejected user and all their data.
      // Non-critical cleanup (accounts, sessions) failures are logged but
      // do not block the primary user deletion.
      const cascadeErrors: string[] = [];

      try {
        await db.delete(baAccount).where(eq(baAccount.userId, userId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[admin:reject] Failed to delete accounts for user ${userId}:`, msg);
        cascadeErrors.push(`accounts: ${msg}`);
      }

      try {
        await db.delete(baSession).where(eq(baSession.userId, userId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[admin:reject] Failed to delete sessions for user ${userId}:`, msg);
        cascadeErrors.push(`sessions: ${msg}`);
      }

      // Primary operation — this MUST succeed.
      await db.delete(baUser).where(eq(baUser.id, userId));

      await context.deps.audit.record("admin.user.rejected", {
        actor_id: context.actorId,
        target_user_id: userId,
        target_email: existing.email,
        cascade_errors: cascadeErrors.length > 0 ? cascadeErrors : undefined,
        trace_id: context.traceId,
      });

      return new Response(null, {
        status: 204,
        headers: { "x-trace-id": context.traceId },
      });
    },
  },

  // ── GET /api/v1/admin/users/pending-count ──────────────────────────────
  {
    method: "GET",
    path: "/api/v1/admin/users/pending-count",
    protected: true,
    permissions: ["admin:read"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(baUser)
        .where(eq(baUser.approved, false));

      return json({
        data: { count: result?.count ?? 0 },
        trace_id: context.traceId,
      });
    },
  },

  // ── DELETE /api/v1/admin/users/:userId ─────────────────────────────────
  {
    method: "DELETE",
    path: "/api/v1/admin/users/:userId",
    protected: true,
    permissions: ["admin:delete"],
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

      // Cascade delete: accounts → sessions → user.
      // baSession and baAccount have ON DELETE CASCADE, but be explicit for
      // auditability. Non-critical cleanup failures are logged but do not
      // block the primary user deletion.
      const cascadeErrors: string[] = [];

      try {
        await db.delete(baAccount).where(eq(baAccount.userId, userId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[admin:delete] Failed to delete accounts for user ${userId}:`, msg);
        cascadeErrors.push(`accounts: ${msg}`);
      }

      try {
        await db.delete(baSession).where(eq(baSession.userId, userId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[admin:delete] Failed to delete sessions for user ${userId}:`, msg);
        cascadeErrors.push(`sessions: ${msg}`);
      }

      // Primary operation — this MUST succeed.
      await db.delete(baUser).where(eq(baUser.id, userId));

      await context.deps.audit.record("admin.user.deleted", {
        actor_id: context.actorId,
        target_user_id: userId,
        target_email: existing.email,
        cascade_errors: cascadeErrors.length > 0 ? cascadeErrors : undefined,
        trace_id: context.traceId,
      });

      return new Response(null, {
        status: 204,
        headers: { "x-trace-id": context.traceId },
      });
    },
  },
];
