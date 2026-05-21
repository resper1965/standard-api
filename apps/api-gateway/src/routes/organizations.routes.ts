import { z } from "zod";
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
    openapi: {
      summary: "Create Organization",
      description: "Creates an organization under the authenticated tenant.",
      request: {
        body: { content: { "application/json": { schema: CreateOrganizationRequestSchema } } }
      },
      responses: {
        201: { description: "Organization created", content: { "application/json": { schema: z.object({ organization_id: z.string(), slug: z.string(), name: z.string(), status: z.string(), tenant_id: z.string(), trace_id: z.string() }) } } }
      }
    },
    handler: async ({ request, deps, tenantId, traceId }) => {
      const body = await parseJson(request, CreateOrganizationRequestSchema);
      
      const tenantDb = deps.organizations.withTenant(tenantId!);
      const organization = await tenantDb.create({
        slug: body.slug,
        name: body.name
      });
      await deps.audit.record("organization.created", { tenant_id: body.tenant_id, organization_id: organization.organization_id, trace_id: traceId });
      return json({ ...organization, trace_id: traceId }, { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const tenantDb = deps.organizations.withTenant(tenantId!);
      const organization = await tenantDb.get(routeParam(params, "organizationId"));
      if (!organization) throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      return json({ ...organization, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/tenants/:tenantId/organizations",
    protected: true,
    openapi: {
      summary: "List Organizations by Tenant",
      description: "Returns all organizations for the specified tenant.",
      request: {
        params: z.object({ tenantId: z.string() })
      },
      responses: {
        200: { description: "Organization list", content: { "application/json": { schema: z.object({ data: z.array(z.object({ organization_id: z.string(), name: z.string(), slug: z.string(), status: z.string() })), trace_id: z.string() }) } } }
      }
    },
    handler: async ({ deps, tenantId, traceId }) => {
      const tenantDb = deps.organizations.withTenant(tenantId!);
      const organizations = await tenantDb.list();
      return json({ data: organizations, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/organizations/:organizationId",
    protected: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const organizationId = routeParam(params, "organizationId");
      const body = await request.json() as { name?: string; slug?: string; status?: "active" | "inactive" };
      
      const patch: any = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.slug !== undefined) patch.slug = body.slug;
      if (body.status !== undefined) patch.status = body.status;

      const tenantDb = deps.organizations.withTenant(tenantId!);
      const updated = await tenantDb.update(organizationId, patch);

      if (!updated) throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      
      await deps.audit.record("organization.updated", { organization_id: organizationId, trace_id: traceId });
      return json({ ...updated, trace_id: traceId });
    }
  }
];

