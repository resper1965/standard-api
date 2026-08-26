import {
  z,
  CreateTenantRequestSchema,
  UpdateTenantRequestSchema,
  TenantResponseSchema,
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam, routeUuidParam } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";

/**
 * `tenant` is legacy vocabulary: the column was renamed to `organization_id`
 * in migration 0032 and `/api/v1/organizations` already offers create, read
 * and update with the same platform-admin gate. These paths are kept as
 * aliases and, per the versioning policy published in the OpenAPI spec,
 * advertise deprecation for at least 90 days before removal.
 */
const SUNSET_AT = "Wed, 25 Nov 2026 00:00:00 GMT";

const deprecate = (response: Response, successor: string): Response => {
  const headers = new Headers(response.headers);
  headers.set("Deprecation", "true");
  headers.set("Sunset", SUNSET_AT);
  headers.set("Link", `<${successor}>; rel="successor-version"`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const DEPRECATION_NOTE =
  " DEPRECATED: use the equivalent /api/v1/organizations endpoint. This alias" +
  " returns a Deprecation header and is scheduled for removal after " +
  SUNSET_AT +
  ".";

/**
 * Tenant management routes â€” PLATFORM ADMIN ONLY.
 *
 * All routes in this file require the `platform_admin` flag on the user.
 * No tenant-scoped user (owner, admin, member) should ever reach these handlers.
 *
 * Security: requirePlatformAdmin() is called as the first statement in every
 * handler. It throws 403 + logs a security event before any data is touched.
 */
export const tenantsRoutes: RouteDefinition[] = [
  // â”€â”€ POST /api/v1/tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "POST",
    path: "/api/v1/tenants",
    openapi: {
      tags: ["Tenants"],
      summary: "Create Tenant",
      deprecated: true,
      description:
        "PLATFORM ADMIN ONLY. Creates a new tenant (organization) in the system." +
        DEPRECATION_NOTE,
      responses: {
        201: {
          description: "Tenant Created",
          content: {
            "application/json": {
              schema: z.intersection(
                TenantResponseSchema,
                z.object({ trace_id: z.string() }),
              ),
            },
          },
        },
      },
    },
    protected: true, // was: requireActor: false â€” SECURITY FIX: must be authenticated
    permissions: ["admin:write"],
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const body = await parseJson(context.request, CreateTenantRequestSchema);
      const tenant = await context.deps.tenants.create(body);
      await context.deps.audit.record("tenant.created", {
        organization_id: tenant.organization_id,
        actor_id: context.actorId,
        trace_id: context.traceId,
      });
      return deprecate(
        json({ ...tenant, trace_id: context.traceId }, { status: 201 }),
        "/api/v1/organizations",
      );
    },
  },
  // â”€â”€ GET /api/v1/tenants/:organizationId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/tenants/:organizationId",
    openapi: {
      tags: ["Tenants"],
      summary: "Get Tenant",
      deprecated: true,
      description:
        "PLATFORM ADMIN ONLY. Retrieves the details of a specific tenant." +
        DEPRECATION_NOTE,
      responses: {
        200: {
          description: "Tenant Details",
          content: {
            "application/json": {
              schema: z.intersection(
                TenantResponseSchema,
                z.object({ trace_id: z.string() }),
              ),
            },
          },
        },
      },
    },
    protected: true,
    permissions: ["admin:read"],
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const tenant = await context.deps.tenants.get(
        routeUuidParam(context.params, "organizationId"),
      );
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      return deprecate(
        json({ ...tenant, trace_id: context.traceId }),
        "/api/v1/organizations/{organizationId}",
      );
    },
  },
  // â”€â”€ PATCH /api/v1/tenants/:organizationId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "PATCH",
    path: "/api/v1/tenants/:organizationId",
    openapi: {
      tags: ["Tenants"],
      summary: "Update Tenant",
      deprecated: true,
      description:
        "PLATFORM ADMIN ONLY. Updates the status or details of a tenant." +
        DEPRECATION_NOTE,
      responses: {
        200: {
          description: "Updated Tenant",
          content: {
            "application/json": {
              schema: z.intersection(
                TenantResponseSchema,
                z.object({ trace_id: z.string() }),
              ),
            },
          },
        },
      },
    },
    protected: true,
    permissions: ["admin:write"],
    requireActor: true,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const body = await parseJson(context.request, UpdateTenantRequestSchema);
      const patch = {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {}),
      };
      const tenant = await context.deps.tenants.update(
        routeUuidParam(context.params, "organizationId"),
        patch,
      );
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      await context.deps.audit.record("tenant.updated", {
        organization_id: tenant.organization_id,
        actor_id: context.actorId,
        trace_id: context.traceId,
        changes: patch,
      });
      return deprecate(
        json({ ...tenant, trace_id: context.traceId }),
        "/api/v1/organizations/{id}",
      );
    },
  },
];
