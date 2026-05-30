import { z } from "zod";
import { InviteMemberRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { assertRbac } from "../middleware/rbac.middleware";


const updateOrgInput = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(2).optional(),
  status: z.enum(["active", "inactive"]).optional()
});

const updateBillingInput = z.object({
  billing_tier: z.string().min(1)
});

export const organizationsMgmtRoutes: RouteDefinition[] = [
  // ── PATCH /organizations/:organizationId ──────────────────
  {
    method: "PATCH",
    path: "/api/v1/organizations/:organizationId",
    protected: true,
    requireActor: true,
    bodySchema: updateOrgInput,
    handler: async (context) => {
      const organizationId = routeParam(context.params, "organizationId");
      const body = context.validatedBody as z.infer<typeof updateOrgInput>;

      // Only owners/admins (organization:update) can change org settings.
      await assertRbac(context, ["organization:update"]);

      const patch: any = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.slug !== undefined) patch.slug = body.slug;
      if (body.status !== undefined) patch.status = body.status;

      if (Object.keys(patch).length === 0) {
        return json({ error: "No fields to update." }, { status: 400 });
      }

      const tenantDb = context.deps.organizations.withTenant(context.tenantId!);
      const updated = await tenantDb.update(organizationId, patch);

      if (!updated) {
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      }

      await context.deps.audit.record("organization.updated", {
        organization_id: organizationId,
        trace_id: context.traceId,
        changes: patch
      });

      return json({ ...updated, trace_id: context.traceId });
    }
  },
  // ── PATCH /organizations/:organizationId/billing ──────────
  {
    method: "PATCH",
    path: "/api/v1/organizations/:organizationId/billing",
    protected: true,
    requireActor: true,
    bodySchema: updateBillingInput,
    handler: async (context) => {
      const organizationId = routeParam(context.params, "organizationId");
      const body = context.validatedBody as z.infer<typeof updateBillingInput>;

      // Only owners/admins (organization:update) can change billing.
      await assertRbac(context, ["organization:update"]);

      const tenantDb = context.deps.organizations.withTenant(context.tenantId!);
      const updated = await tenantDb.update(organizationId, { billing_tier: body.billing_tier });

      if (!updated) {
        throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      }

      await context.deps.audit.record("organization.billing_updated", {
        organization_id: organizationId,
        billing_tier: body.billing_tier,
        trace_id: context.traceId
      });

      return json({ ...updated, trace_id: context.traceId });
    }
  },
  // ── POST /organizations/:organizationId/invites ───────────
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/invites",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    bodySchema: InviteMemberRequestSchema,
    handler: async (context) => {
      const orgId = routeParam(context.params, "organizationId");
      const org = await context.deps.organizations.get(orgId, context.tenantId!);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      const body = context.validatedBody as import("@standard/schemas").InviteMemberRequest;

      // Check duplicate via Drizzle
      const existing = await context.deps.members.listByOrganization(orgId, context.tenantId!);
      if (existing.some((m) => m.email === body.email)) {
        throw new ApiError("CONFLICT", `Member with email ${body.email} already exists.`, 409);
      }


      const now = new Date().toISOString();
      const membership = await context.deps.members.create({
        membership_id: crypto.randomUUID(),
        tenant_id: context.tenantId!,
        organization_id: orgId,
        user_id: null,
        email: body.email,
        display_name: body.display_name ?? null,
        role: body.role,
        status: "invited",
        invited_at: now,
      });

      await context.deps.audit.record("member.invited", {
        tenant_id: context.tenantId,
        organization_id: orgId,
        email: body.email,
        role: body.role,
        trace_id: context.traceId
      });

      return json(membership, {
        status: 201,
        headers: {
          "x-trace-id": context.traceId,
          "Warning": '299 - "This endpoint is deprecated. Use POST /api/v1/organizations/:organizationId/members instead."'
        }
      });
    }
  }
];
