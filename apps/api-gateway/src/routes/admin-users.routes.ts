/**
 * Admin User Management Routes — PLATFORM ADMIN ONLY.
 *
 * Queries Better Auth tables via AuthRepository (ADR-009).
 * Direct baUser/baSession/baAccount access is encapsulated in AuthRepository.
 *
 * All routes require the `platform_admin` flag on the authenticated user.
 * These are cross-tenant operations — no organization_id scoping required.
 */
import { z } from "zod";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { organizations, memberships, users } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json, parseJson, routeParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";
import { sanitizeLikeInput } from "@standard/security";
import type { AuthRepository } from "@standard/auth";
import { resolveOrganizationContext } from "../adapters/tenant-mapping";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract AuthRepository from deps or throw 500. */
const getRepo = (context: RequestContext): AuthRepository => {
  const repo = context.deps.authRepo;
  if (!repo) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "AuthRepository not available for admin operations.",
      500,
    );
  }
  return repo;
};

/** For domain-table queries (users, organizations, memberships) we still use _db. */
const getDomainDb = (context: RequestContext) => {
  const db = context.deps._db;
  if (!db) throw new ApiError("INTERNAL_ERROR", "Database not available.", 500);
  return db;
};

/** Zod schema for query-string parsing on the list endpoint. */
const ListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});

/** Zod schema for the PATCH body. */
const UpdateUserBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
  })
  .refine((d) => d.name, {
    message: "At least one of 'name' must be provided.",
  });

/** Zod schema for the ban body. */
const BanUserBodySchema = z.object({
  reason: z.string().max(500).optional(),
  banExpires: z.coerce.date().optional(),
});

/** Zod schema for the approve body — organization assignment is mandatory. */
const ApproveUserBodySchema = z.object({
  organization_id: z
    .string()
    .min(1, "organization_id is required to assign the user."),
  role: z.string().min(1).max(50).default("member"),
});

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

      const repo = getRepo(context);
      const url = new URL(context.request.url);
      const query = ListUsersQuerySchema.parse({
        limit: url.searchParams.has("limit")
          ? Math.min(Number(url.searchParams.get("limit")), 100)
          : undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
      });

      const { data: usersData, total } = await repo.listUsersWithSearch({
        limit: query.limit,
        offset: query.offset,
        ...(query.search !== undefined ? { search: query.search } : {}),
      });

      return json({
        data: usersData,
        total,
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

      // User creation requires password hashing via Better Auth API
      const { getCachedAuth } = await import("../index-helpers");
      const auth = getCachedAuth();
      if (!auth) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Auth instance not available",
          500,
        );
      }

      try {
        const res = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            jobTitle: "",
            phone: "",
          },
        });

        // Auto-approve and optionally elevate to platform admin
        const repo = getRepo(context);
        const updateData: Record<string, unknown> = { approved: true };
        if (body.role === "admin") updateData.platformAdmin = true;
        await repo.updateUser(res.user.id, updateData as any);
        const user = await repo.getUserById(res.user.id);

        await context.deps.audit.record("admin.user.created", {
          actor_id: context.actorId,
          target_email: body.email,
          role: body.role,
          trace_id: context.traceId,
        });

        return json({ data: user, trace_id: context.traceId }, { status: 201 });
      } catch (err: any) {
        throw new ApiError(
          "VALIDATION_ERROR",
          err.message || "Failed to create user",
          400,
        );
      }
    },
  },

  // ── PATCH /api/v1/admin/users/:userId ─────────────────────────────────────
  {
    method: "PATCH",
    path: "/api/v1/admin/users/:userId",
    protected: true,
    permissions: ["admin:write"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, UpdateUserBodySchema);

      // Verify user exists via repo
      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      if (body.name) {
        await repo.updateUser(userId, { name: body.name });
      }

      // Fetch updated user for response
      const updated = await repo.getUserById(userId);

      await context.deps.audit.record("admin.user.updated", {
        actor_id: context.actorId,
        target_user_id: userId,
        changes: { name: body.name },
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/ban ──────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/ban",
    protected: true,
    permissions: ["admin:create"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, BanUserBodySchema);

      // Verify user exists and is not a platform admin
      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }
      if (existing.platformAdmin) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot ban a platform admin. Remove platform_admin flag first.",
          403,
        );
      }

      // revokeUser() atomically: marks approved=false + deletes all sessions (transaction)
      await repo.revokeUser(userId);

      // Fetch updated for response
      const updated = await repo.getUserById(userId);

      await context.deps.audit.record("admin.user.revoked", {
        actor_id: context.actorId,
        target_user_id: userId,
        reason: body.reason ?? "no reason provided",
        trace_id: context.traceId,
      });

      // Edge cache revocation — forces immediate rejection at the middleware
      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "user_banned",
          { expirationTtl: 86400 }, // 24h
        ).catch(() => {});
      }

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/unban ────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/unban",
    protected: true,
    permissions: ["admin:create"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const userId = routeParam(context.params, "userId");

      // Verify user exists
      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      // approveUser() atomically: marks approved=true + invalidates pre-revocation sessions
      await repo.approveUser(userId);

      // Fetch updated for response
      const updated = await repo.getUserById(userId);

      await context.deps.audit.record("admin.user.reactivated", {
        actor_id: context.actorId,
        target_user_id: userId,
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/approve ──────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/approve",
    protected: true,
    permissions: ["admin:approve"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const db = getDomainDb(context);
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, ApproveUserBodySchema);

      // Verify user exists and is not already approved
      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }
      if (existing.approved) {
        return json({
          data: { message: "User is already approved." },
          trace_id: context.traceId,
        });
      }

      // Verify the target organization exists
      const [org] = await (db as any)
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, body.organization_id))
        .limit(1);
      if (!org) {
        throw new ApiError(
          "NOT_FOUND",
          "Organization not found. Select a valid organization.",
          404,
        );
      }

      // 1. approveUser() atomically: marks approved=true + invalidates pre-approval session (transaction)
      await repo.approveUser(userId);

      // 2. Upsert into domain users
      let domainUserId: string;
      const [existingDomainUser] = await (db as any)
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, existing.email))
        .limit(1);

      if (existingDomainUser) {
        domainUserId = existingDomainUser.id;
        await (db as any)
          .update(users)
          .set({ identityProviderSubject: userId })
          .where(eq(users.id, domainUserId));
      } else {
        const [newDomainUser] = await (db as any)
          .insert(users)
          .values({
            email: existing.email,
            displayName: existing.name || "User",
            identityProvider: "standard-native-auth",
            identityProviderSubject: userId,
          })
          .returning({ id: users.id });
        domainUserId = newDomainUser!.id;
      }

      // 3. Upsert into memberships
      const [existingMembership] = await (db as any)
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, body.organization_id),
            eq(memberships.userId, domainUserId),
          ),
        )
        .limit(1);

      if (!existingMembership) {
        await (db as any).insert(memberships).values({
          organizationId: body.organization_id,
          userId: domainUserId,
          email: existing.email,
          displayName: existing.name,
          role: body.role ?? "member",
          status: "active",
          acceptedAt: new Date(),
        });
      }

      await context.deps.audit.record("admin.user.approved", {
        actor_id: context.actorId,
        target_user_id: userId,
        organization_id: body.organization_id,
        assigned_role: body.role ?? "member",
        trace_id: context.traceId,
      });

      // Edge cache soft revocation — clears downstream caches on next request.
      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "membership_change",
          { expirationTtl: 10 }, // 10s — just enough to bust cached session data
        ).catch(() => {});
      }

      const updated = await repo.getUserById(userId);
      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // ── POST /api/v1/admin/users/:userId/reject ─────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/admin/users/:userId/reject",
    protected: true,
    permissions: ["admin:create"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const userId = routeParam(context.params, "userId");

      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }
      if (existing.platformAdmin) {
        throw new ApiError("FORBIDDEN", "Cannot reject a platform admin.", 403);
      }

      // deleteUserCascade() is atomic: accounts → sessions → verification → user
      await repo.deleteUserCascade(userId);

      await context.deps.audit.record("admin.user.rejected", {
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

  // ── GET /api/v1/admin/users/pending-count ─────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/admin/users/pending-count",
    protected: true,
    permissions: ["admin:read"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const repo = getRepo(context);
      const count = await repo.getPendingCount();

      return json({
        data: { count },
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

      const repo = getRepo(context);
      const userId = routeParam(context.params, "userId");

      // Verify user exists
      const existing = await repo.getUserById(userId);
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

      // deleteUserCascade() is atomic: accounts → sessions → verification → user (transaction)
      await repo.deleteUserCascade(userId);

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
