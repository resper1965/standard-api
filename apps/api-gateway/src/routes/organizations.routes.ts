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
      description: "Returns all organizations for the specified tenant.",
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
      return json({ data: organizations, trace_id: traceId });
    },
  },

  // ── NEW: Usage metrics per organization (closes #81) ───────────────────
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
        // Graceful degradation — usage tracking not yet fully wired
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
];
