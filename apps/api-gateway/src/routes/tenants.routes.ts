import { CreateTenantRequestSchema, UpdateTenantRequestSchema } from "@aegis/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

export const tenantsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/tenants",
    requireActor: false,
    handler: async ({ request, deps, traceId }) => {
      const body = await parseJson(request, CreateTenantRequestSchema);
      const tenant = await deps.tenants.create(body);
      return json({ ...tenant, trace_id: traceId }, { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/tenants/:tenantId",
    protected: true,
    handler: async ({ deps, params, traceId }) => {
      const tenant = await deps.tenants.get(routeParam(params, "tenantId"));
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      return json({ ...tenant, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/tenants/:tenantId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, traceId }) => {
      const body = await parseJson(request, UpdateTenantRequestSchema);
      const patch = {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {})
      };
      const tenant = await deps.tenants.update(routeParam(params, "tenantId"), patch);
      if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found.", 404);
      return json({ ...tenant, trace_id: traceId });
    }
  }
];
