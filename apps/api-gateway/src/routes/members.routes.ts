/**
 * Member Management Routes — G1: User & Role RBAC
 *
 * CRUD for organization memberships: invite, list, update role, remove.
 * All routes require `membership:manage` permission.
 *
 * Previously used an in-memory Map — now persisted via Drizzle.
 */
import { InviteMemberRequestSchema, UpdateMemberRoleRequestSchema } from "@standard/schemas";
import { eq } from "drizzle-orm";
import { baMember, baUser } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import type { DbClient } from "../adapters/db";

export const memberRoutes: RouteDefinition[] = [
  // POST /organizations/:orgId/members (invite)
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/members",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async (context) => {
      const { request, deps, params, tenantId, actorId, traceId } = context;
      const orgId = routeParam(params, "organizationId");
      const org = await deps.organizations.get(orgId, tenantId!);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      const body = await parseJson(request, InviteMemberRequestSchema);

      // Check duplicate within this org
      const existing = await deps.members.listByOrganization(orgId, tenantId!);
      if (existing.some(m => m.email === body.email)) {
        throw new ApiError("CONFLICT", `Member with email ${body.email} already exists.`, 409);
      }

      // ── One-org-per-user enforcement ────────────────────────────────
      // Non-platform-admin users can only belong to ONE organization.
      // Before adding the invite, check if the invited email is already
      // an active member of any org in the Better Auth `member` table.
      // We use _db to query the BA-managed table directly.
      if (deps._db) {
        const db = deps._db as DbClient;
        // Find the BA user by email first
        const [invitedUser] = await db
          .select({ id: baUser.id, platformAdmin: baUser.platformAdmin })
          .from(baUser)
          .where(eq(baUser.email, body.email))
          .limit(1);

        if (invitedUser && !invitedUser.platformAdmin) {
          // User exists and is not a platform admin — check their current org count
          const [existingMembership] = await db
            .select({ id: baMember.id, organizationId: baMember.organizationId })
            .from(baMember)
            .where(eq(baMember.userId, invitedUser.id))
            .limit(1);

          if (existingMembership && existingMembership.organizationId !== orgId) {
            throw new ApiError(
              "SINGLE_ORG_LIMIT",
              `User ${body.email} already belongs to another organization. Non-admin users may only belong to one organization.`,
              409,
              [{ reason: "single_org_limit", existing_org_id: existingMembership.organizationId }]
            );
          }
        }
      }

      const now = new Date().toISOString();
      const membership = await deps.members.create({
        membership_id: crypto.randomUUID(),
        tenant_id: tenantId!,
        organization_id: orgId,
        user_id: null,
        email: body.email,
        display_name: body.display_name ?? null,
        role: body.role,
        status: "invited",
        invited_at: now,
      });

      await deps.audit.record("member.invited", {
        tenant_id: tenantId,
        organization_id: orgId,
        email: body.email,
        role: body.role,
        trace_id: traceId,
      });
      return json(membership, { status: 201, headers: { "x-trace-id": traceId } });
    },
  },

  // GET /organizations/:orgId/members (list)
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/members",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const orgId = routeParam(params, "organizationId");
      const org = await deps.organizations.get(orgId, tenantId!);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      const members = await deps.members.listByOrganization(orgId, tenantId!);
      return json({ data: members, trace_id: traceId });
    },
  },

  // PATCH /members/:memberId (update role)
  {
    method: "PATCH",
    path: "/api/v1/members/:memberId",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = await deps.members.getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      const body = await parseJson(request, UpdateMemberRoleRequestSchema);
      const updated = await deps.members.updateRole(memberId, tenantId!, body.role);
      if (!updated) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      await deps.audit.record("member.role_updated", {
        tenant_id: tenantId,
        organization_id: member.organization_id,
        member_id: memberId,
        role: body.role,
        trace_id: traceId,
      });
      return json(updated, { headers: { "x-trace-id": traceId } });
    },
  },

  // DELETE /members/:memberId (remove)
  {
    method: "DELETE",
    path: "/api/v1/members/:memberId",
    protected: true,
    requireActor: true,
    permissions: ["membership:manage"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = await deps.members.getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      const removed = await deps.members.remove(memberId, tenantId!);
      if (!removed) throw new ApiError("NOT_FOUND", "Membership not found.", 404);

      await deps.audit.record("member.removed", {
        tenant_id: tenantId,
        organization_id: member.organization_id,
        member_id: memberId,
        trace_id: traceId,
      });
      return new Response(null, { status: 204, headers: { "x-trace-id": traceId } });
    },
  },

  // GET /members/:memberId (single)
  {
    method: "GET",
    path: "/api/v1/members/:memberId",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const memberId = routeParam(params, "memberId");
      const member = await deps.members.getById(memberId, tenantId!);
      if (!member) throw new ApiError("NOT_FOUND", "Membership not found.", 404);
      return json(member, { headers: { "x-trace-id": traceId } });
    },
  },
];
