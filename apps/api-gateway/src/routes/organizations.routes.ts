import { CreateOrganizationRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

export const organizationsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/organizations",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, tenantId, traceId }) => {
      const body = await parseJson(request, CreateOrganizationRequestSchema);
      if (body.tenant_id !== tenantId) throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
      const organization = await deps.organizations.create({
        tenant_id: body.tenant_id,
        slug: body.slug,
        name: body.name
      });
      return json({ ...organization, trace_id: traceId }, { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const organization = await deps.organizations.get(routeParam(params, "organizationId"), tenantId!);
      if (!organization) throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      return json({ ...organization, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/tenants/:tenantId/organizations",
    protected: true,
    handler: async ({ deps, tenantId, traceId }) => {
      const organizations = await deps.organizations.listByTenant(tenantId!);
      return json({ data: organizations, trace_id: traceId });
    }
  }
];

