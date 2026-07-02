/**
 * Admin User Management Routes â€” PLATFORM ADMIN ONLY.
 *
 * Queries Better Auth tables via AuthRepository (ADR-009).
 * Direct baUser/baSession/baAccount access is encapsulated in AuthRepository.
 *
 * All routes require the `platform_admin` flag on the authenticated user.
 * These are cross-tenant operations â€” no organization_id scoping required.
 */
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json, parseJson, routeParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";
import { sanitizeLikeInput } from "@standard/security";
import type { AuthRepository } from "@standard/auth";
import { isPlatformAdminEmail } from "@standard/auth";
import { resolveOrganizationContext } from "../adapters/tenant-mapping";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

/**
 * True se o utilizador Ã© um platform admin PROTEGIDO contra ban/reject/delete.
 * Cobre dois casos:
 *  - `platform_admin = true` na DB (guard existente); e
 *  - email em PLATFORM_ADMIN_EMAILS, mesmo que a flag na DB esteja a false
 *    (estado divergente) â€” alinhado com o override por request no middleware,
 *    para a conta master nÃ£o poder ser removida por outro admin.
 */
const isProtectedPlatformAdmin = (
  existing: { platformAdmin?: boolean | null; email?: string | null },
  context: RequestContext,
): boolean =>
  existing.platformAdmin === true ||
  isPlatformAdminEmail(existing.email, context.env?.PLATFORM_ADMIN_EMAILS);

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

/**
 * Zod schema for the PATCH body.
 * NOTE: "user"/"admin" are Better Auth native role labels stored in the `user.role` column.
 * auth.middleware.ts normalizes these to "org_admin"/"platform_admin" at session resolution.
 */
const UpdateUserBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    role: z.enum(["user", "admin"]).optional(),
  })
  .refine((d) => d.name || d.role, {
    message: "At least one of 'name' or 'role' must be provided.",
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
  role: z.enum(["platform_admin", "org_admin"]).default("org_admin"),
});

// ————————————————————————————————————————————————————————————————————————————————

export const adminUsersRoutes: RouteDefinition[] = [
  // â”€â”€ GET /api/v1/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ POST /api/v1/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        password: z.string().min(12),
        role: z.enum(["user", "admin"]).default("user"),
      });

      const body = await parseJson(context.request, CreateUserBodySchema);

      // User creation requires password hashing via Better Auth API
      const auth = context.betterAuth;
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
        if (body.role === "admin") {
          updateData.platformAdmin = true;
          updateData.role = "admin";
        } else {
          updateData.role = "user";
        }
        await repo.updateUser(res.user.id, updateData as any);
        const user = await repo.getUserById(res.user.id);

        await context.deps.audit.record("admin.user.created", {
          actor_id: context.actorId,
          target_email: body.email,
          role: body.role,
          trace_id: context.traceId,
        });

        return json({ data: user, trace_id: context.traceId }, { status: 201 });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new ApiError(
          "VALIDATION_ERROR",
          `Failed to create user: ${errorMsg}`,
          400,
        );
      }
    },
  },

  // â”€â”€ PATCH /api/v1/admin/users/:userId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // Role update â€” Better Auth doesn't expose a role-change API through the
      // adapter, so we update the `role` column directly via the auth DB client.
      if (body.role) {
        const db = getDomainDb(context);
        await db.execute(
          sql`UPDATE public."user" SET role = ${body.role}, updated_at = NOW() WHERE id = ${userId}`,
        );
      }

      // Fetch updated user for response
      const updated = await repo.getUserById(userId);

      await context.deps.audit.record("admin.user.updated", {
        actor_id: context.actorId,
        target_user_id: userId,
        changes: { name: body.name, role: body.role },
        trace_id: context.traceId,
      });

      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // â”€â”€ POST /api/v1/admin/users/:userId/ban â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (isProtectedPlatformAdmin(existing, context)) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot ban a protected platform admin. Remove the platform_admin flag or remove the email from PLATFORM_ADMIN_EMAILS first.",
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

      // Edge cache revocation â€” forces immediate rejection at the middleware
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

  // â”€â”€ POST /api/v1/admin/users/:userId/unban â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ POST /api/v1/admin/users/:userId/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const userId = routeParam(context.params, "userId");
      const body = await parseJson(context.request, ApproveUserBodySchema);

      // Verify user exists
      const existing = await repo.getUserById(userId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "User not found.", 404);
      }

      const db = getDomainDb(context);

      // Link the user to the target organization (1:1 owner model)
      const [updatedOrg] = await db
        .update(organizations)
        .set({ userId: userId })
        .where(eq(organizations.id, body.organization_id))
        .returning();

      if (!updatedOrg) {
        throw new ApiError(
          "NOT_FOUND",
          `Organization with ID ${body.organization_id} not found. Cannot assign user.`,
          404,
        );
      }

      // If user is not yet approved, approve them now
      if (!existing.approved) {
        // approveUser() atomically: marks approved=true + invalidates pre-approval session
        await repo.approveUser(userId);
      }

      // Link the session org — baUser.id IS the domain identity in 1:1 model
      // The user must activate an org via POST /v1/auth/activate-org after approval
      await context.deps.audit.record("admin.user.approved", {
        actor_id: context.actorId,
        target_user_id: userId,
        organization_id: body.organization_id,
        trace_id: context.traceId,
      });

      // Bust KV session cache for this user
      if (context.env?.STANDARD_CACHE) {
        await context.env.STANDARD_CACHE.put(
          `revocations:user:${userId}`,
          "approved",
          { expirationTtl: 10 }, // 10s — bust caches on next request
        ).catch(() => {});
      }

      const updated = await repo.getUserById(userId);
      return json({ data: updated, trace_id: context.traceId });
    },
  },

  // â”€â”€ POST /api/v1/admin/users/:userId/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (isProtectedPlatformAdmin(existing, context)) {
        throw new ApiError("FORBIDDEN", "Cannot reject a platform admin.", 403);
      }

      // deleteUserCascade() is atomic: accounts â†’ sessions â†’ verification â†’ user
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

  // â”€â”€ GET /api/v1/admin/users/pending-count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ DELETE /api/v1/admin/users/:userId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // Prevent deleting platform admins â€” catastrophic safety net.
      if (isProtectedPlatformAdmin(existing, context)) {
        throw new ApiError(
          "FORBIDDEN",
          "Cannot delete a protected platform admin. Remove the platform_admin flag or remove the email from PLATFORM_ADMIN_EMAILS first.",
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

      // deleteUserCascade() is atomic: accounts â†’ sessions â†’ verification â†’ user (transaction)
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
