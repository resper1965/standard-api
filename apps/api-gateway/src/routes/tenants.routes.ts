import { CreateTenantRequestSchema, UpdateTenantRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";

/**
 * Tenant management routes — PLATFORM ADMIN ONLY.
 *
 * All routes in this file require the `platform_admin` flag on the user.
 * No tenant-scoped user (owner, admin, member) should ever reach these handlers.
 *
 * Security: requirePlatformAdmin() is called as the first statement in every
 * handler. It throws 403 + logs a security event before any data is touched.
 */
export const tenantsRoutes: RouteDefinition[] = [
  // ── POST /api/v1/tenants ─────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/tenants",
    protected: true,      // was: requireActor: false — SECURITY FIX: must be authenticated
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const body = await parseJson(context.request, CreateTenantRequestSchema);
      const tenant = await context.deps.tenants.create(body);
      await context.deps.audit.record("tenant.created", {
        tenant_id: tenant.tenant_id,
        actor_id: context.actorId,
        trace_id: context.traceId,
      });
      return json({ ...tenant, trace_id: context.traceId }, { status: 201 });
    }
  },
  // ── GET /api/v1/tenants/:tenantId ────────────────────────────
  {
    method: "GET",
    path: "/api/v1/tenants/:tenantId",
    protected: true,
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const tenant = await context.deps.tenants.get(routeParam(context.params, "tenantId"));
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      return json({ ...tenant, trace_id: context.traceId });
    }
  },
  // ── PATCH /api/v1/tenants/:tenantId ──────────────────────────
  {
    method: "PATCH",
    path: "/api/v1/tenants/:tenantId",
    protected: true,
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const body = await parseJson(context.request, UpdateTenantRequestSchema);
      const patch = {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {})
      };
      const tenant = await context.deps.tenants.update(routeParam(context.params, "tenantId"), patch);
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      await context.deps.audit.record("tenant.updated", {
        tenant_id: tenant.tenant_id,
        actor_id: context.actorId,
        trace_id: context.traceId,
        changes: patch,
      });
      return json({ ...tenant, trace_id: context.traceId });
    }
  }
];
