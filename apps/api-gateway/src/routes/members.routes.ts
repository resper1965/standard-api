/**
 * Member Management Routes — G1: User & Role RBAC
 *
 * CRUD for organization memberships: invite, list, update role, remove.
 * All routes require `membership:manage` permission.
 */
import { InviteMemberRequestSchema, UpdateMemberRoleRequestSchema, type Membership } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

// ── In-memory membership store (production: Drizzle adapter) ─
// This follows the same pattern as other in-memory repos in the monorepo.
const memberships = new Map<string, Membership>();

const listByOrg = (orgId: string, tenantId: string): Membership[] =>
  [...memberships.values()].filter((m) => m.organization_id === orgId && m.tenant_id === tenantId && m.status !== "removed");

const getById = (id: string, tenantId: string): Membership | undefined => {
  const m = memberships.get(id);
  return m && m.tenant_id === tenantId ? m : undefined;
};

export const memberRoutes: RouteDefinition[] = [
  // ── POST /organizations/:orgId/members (invite) ─────────
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/members",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const orgId = routeParam(params, "organizationId");
      const org = await deps.organizations.get(orgId, tenantId!);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      const body = await parseJson(request, InviteMemberRequestSchema);
      const now = new Date().toISOString();

      // Check for duplicate invite
      const existing = listByOrg(orgId, tenantId!).find((m) => m.email === body.email);
      if (existing) throw new ApiError("CONFLICT", `Member with email ${body.email} already exists.`, 409);

      const membership: Membership = {
        membership_id: crypto.randomUUID(),
        tenant_id: tenantId!,
        organization_id: orgId,
        user_id: null, // set on acceptance
        email: body.email,
        display_name: body.display_name ?? null,
        role: body.role,
        status: "invited",
        invited_at: now,
        accepted_at: null,
        created_at: now,
        updated_at: now,
      };

      memberships.set(membership.membership_id, membership);
      return json(membership, { status: 201, headers: { "x-trace-id": traceId } });
    }
  },
  // ── GET /organizations/:orgId/members (list) ────────────
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/members",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const orgId = routeParam(params, "organizationId");
      const org = await deps.organizations.get(orgId, tenantId!);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      return json({ data: listByOrg(orgId, tenantId!), trace_id: traceId });
    }
  },
  // ── PATCH /members/:memberId (update role) ──────────────
  {
    method: "PATCH",
    path: "/api/v1/members/:memberId",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async ({ request, params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      const body = await parseJson(request, UpdateMemberRoleRequestSchema);
      member.role = body.role;
      member.updated_at = new Date().toISOString();
      memberships.set(memberId, member);

      return json(member, { headers: { "x-trace-id": traceId } });
    }
  },
  // ── DELETE /members/:memberId (remove) ──────────────────
  {
    method: "DELETE",
    path: "/api/v1/members/:memberId",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async ({ params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      member.status = "removed";
      member.updated_at = new Date().toISOString();
      memberships.set(memberId, member);

      return new Response(null, { status: 204, headers: { "x-trace-id": traceId } });
    }
  },
  // ── GET /members/:memberId (single) ─────────────────────
  {
    method: "GET",
    path: "/api/v1/members/:memberId",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      return json(member, { headers: { "x-trace-id": traceId } });
    }
  }
];
