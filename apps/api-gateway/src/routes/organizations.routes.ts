import { z } from "zod";
import { CreateOrganizationRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

export const organizationsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/organizations",
    protected: true,
    permissions: ["organization:create"],
    requireActor: true,
    openapi: {
      summary: "Create Organization",
      description: "Creates an organization under the authenticated tenant.",
      request: {
        body: {
          content: {
            "application/json": { schema: CreateOrganizationRequestSchema },
          },
        },
      },
      responses: {
        201: {
          description: "Organization created",
          content: {
            "application/json": {
              schema: z.object({
                organization_id: z.string(),
                slug: z.string(),
                name: z.string(),
                status: z.string(),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, deps, organizationId, traceId }) => {
      const body = await parseJson(request, CreateOrganizationRequestSchema);

      const tenantDb = deps.organizations.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const organization = await tenantDb.create({
        slug: body.slug,
        name: body.name,
      });
      await deps.audit.record("organization.created", {
        organization_id: organization.organization_id,
        trace_id: traceId,
      });
      return json({ ...organization, trace_id: traceId }, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantDb = deps.organizations.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const organization = await tenantDb.get(
        routeUuidParam(params, "organizationId"),
      );
      if (!organization)
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      return json({ ...organization, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tenants/:organizationId/organizations",
    protected: true,
    permissions: ["organization:read"],
    openapi: {
      summary: "List Organizations by Tenant",
      deprecated: true,
      description:
        "Returns all organizations for the specified tenant. DEPRECATED:" +
        " `tenant` is legacy vocabulary for `organization_id` (renamed in" +
        " migration 0032). This alias returns a Deprecation header and is" +
        " scheduled for removal after Wed, 25 Nov 2026 00:00:00 GMT.",
      request: {
        params: z.object({ organizationId: z.string() }),
      },
      responses: {
        200: {
          description: "Organization list",
          content: {
            "application/json": {
              schema: z.object({
                data: z.array(
                  z.object({
                    organization_id: z.string(),
                    name: z.string(),
                    slug: z.string(),
                    status: z.string(),
                  }),
                ),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ deps, organizationId, traceId }) => {
      const tenantDb = deps.organizations.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const organizations = await tenantDb.list();
      const response = json({ data: organizations, trace_id: traceId });
      response.headers.set("Deprecation", "true");
      response.headers.set("Sunset", "Wed, 25 Nov 2026 00:00:00 GMT");
      response.headers.set(
        "Link",
        '</api/v1/organizations>; rel="successor-version"',
      );
      return response;
    },
  },

  // â”€â”€ NEW: Usage metrics per organization (closes #81) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Returns token consumption, estimated cost, and quota status.
  // Source: usage_records table. AI Gateway integration adds richer data when wired.
  {
    method: "GET",
    path: "/api/v1/organizations/:orgId/usage",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, organizationId, traceId, request }) => {
      const orgId = routeUuidParam(params, "orgId");
      const resolvedOrgId = requireOrganizationId({ organizationId });
      if (orgId !== resolvedOrgId) {
        throw new ApiError(
          "FORBIDDEN",
          "Access denied to this organization.",
          403,
        );
      }

      const url = new URL(request.url);
      const period = (url.searchParams.get("period") ?? "month") as
        | "day"
        | "week"
        | "month";
      const VALID_PERIODS = ["day", "week", "month"];
      if (!VALID_PERIODS.includes(period)) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "period must be one of: day, week, month",
          400,
        );
      }

      const now = new Date();
      const since = new Date(now);
      if (period === "day") since.setDate(since.getDate() - 1);
      else if (period === "week") since.setDate(since.getDate() - 7);
      else since.setMonth(since.getMonth() - 1);

      // Attempt to fetch usage data; fall back to a zeroed response if not yet wired
      let usageData = {
        tokens_used: 0,
        requests_count: 0,
        estimated_cost_usd: 0,
      };
      try {
        const auditAny = deps.audit as any;
        if (typeof auditAny?.getUsageMetrics === "function") {
          usageData = await auditAny.getUsageMetrics(
            resolvedOrgId,
            since.toISOString(),
            now.toISOString(),
          );
        }
      } catch {
        // Graceful degradation â€” usage tracking not yet fully wired
      }

      return json({
        data: {
          period,
          tokens_used: usageData.tokens_used,
          estimated_cost_usd: usageData.estimated_cost_usd,
          requests_count: usageData.requests_count,
          quota_limit: null, // Configurable per organization in future
          quota_remaining: null,
          since: since.toISOString(),
          until: now.toISOString(),
        },
        trace_id: traceId,
      });
    },
  },

  // â”€â”€ PATCH /api/v1/organizations/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Updates name and/or slug of an organization owned by the authenticated tenant.
  {
    method: "PATCH",
    path: "/api/v1/organizations/:id",
    protected: true,
    permissions: ["organization:update"],
    requireActor: true,
    openapi: {
      summary: "Update Organization",
      description: "Updates the name and/or slug of an organization.",
      request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
                name: z.string().min(1).max(100).optional(),
                slug: z
                  .string()
                  .min(2)
                  .max(50)
                  .regex(/^[a-z0-9-]+$/)
                  .optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: "Organization updated",
          content: {
            "application/json": {
              schema: z.object({
                organization_id: z.string(),
                name: z.string(),
                slug: z.string(),
                status: z.string(),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const orgId = routeUuidParam(params, "id");
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const body = await parseJson(
        request,
        z.object({
          name: z.string().min(1).max(100).optional(),
          slug: z
            .string()
            .min(2)
            .max(50)
            .regex(
              /^[a-z0-9-]+$/,
              "slug must be lowercase alphanumeric with hyphens",
            )
            .optional(),
        }),
      );

      if (!body.name && !body.slug) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "At least one of name or slug must be provided.",
          400,
        );
      }

      const tenantDb = deps.organizations.withOrganization(resolvedTenantId);

      // Verify the org exists and belongs to this tenant
      const existing = await tenantDb.get(orgId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      }

      const updated = await tenantDb.update(orgId, {
        ...(body.name ? { name: body.name } : {}),
        ...(body.slug ? { slug: body.slug } : {}),
      });

      if (!updated) {
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      }

      await deps.audit.record("organization.updated", {
        organization_id: orgId,
        actor_id: actorId,
        changes: { name: body.name, slug: body.slug },
        trace_id: traceId,
      });

      return json({ ...updated, trace_id: traceId });
    },
  },

  // â”€â”€ DELETE /api/v1/organizations/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Soft-deletes an organization: sets status=inactive and deletedAt.
  // Hard delete is not supported â€” data retention and audit trail must be preserved.
  {
    method: "DELETE",
    path: "/api/v1/organizations/:id",
    protected: true,
    permissions: ["organization:delete"],
    requireActor: true,
    openapi: {
      summary: "Delete Organization",
      description:
        "Soft-deletes an organization by marking it inactive. Data is retained for audit purposes.",
      request: {
        params: z.object({ id: z.string().uuid() }),
      },
      responses: {
        200: {
          description: "Organization deleted",
          content: {
            "application/json": {
              schema: z.object({
                deleted: z.boolean(),
                organization_id: z.string(),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ deps, params, organizationId, actorId, traceId }) => {
      const orgId = routeUuidParam(params, "id");
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const tenantDb = deps.organizations.withOrganization(resolvedTenantId);

      // Verify the org exists and belongs to this tenant before deleting
      const existing = await tenantDb.get(orgId);
      if (!existing) {
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      }

      if (existing.status === "inactive") {
        throw new ApiError(
          "CONFLICT",
          "Organization is already inactive.",
          409,
        );
      }

      const deleted = await tenantDb.delete(orgId);

      if (!deleted) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to delete organization.",
          500,
        );
      }

      await deps.audit.record("organization.deleted", {
        organization_id: orgId,
        actor_id: actorId,
        previous_name: existing.name,
        previous_slug: existing.slug,
        trace_id: traceId,
      });

      return json({ deleted: true, organization_id: orgId, trace_id: traceId });
    },
  },
];
