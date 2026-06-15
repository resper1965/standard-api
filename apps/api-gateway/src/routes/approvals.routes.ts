// @ts-nocheck -- Zod v4 CI type compat
import { CreateApprovalRequestSchema } from "@standard/schemas";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  newId,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { approvalResponse } from "../presenters";

export const approvalsRoutes: RouteDefinition[] = [
  // â”€â”€ Create approval (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/approvals",
    protected: true,
    requireActor: true,
    permissions: ["approval:create"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
      session,
    }) => {
      const body = await parseJson(request, CreateApprovalRequestSchema);
      const assessmentId = routeUuidParam(params, "assessmentId");

      if (
        body.target_type === "assessment_state" &&
        body.target_id !== assessmentId
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Assessment state approvals must target the assessment id.",
          400,
        );
      }

      const permissionByGate = {
        soa: "soa:approve",
        gap_analysis: "gap:approve",
        maturity_assessment: "maturity:approve",
        poam: "poam:approve",
        report: "report:approve",
      } as const;
      const requiredPermission = permissionByGate[body.gate];
      const sessionRole =
        (session?.user?.role as string | undefined) ?? "viewer";
      const gateRoleMap: Record<string, string[]> = {
        "soa:approve": ["owner", "admin", "platform_admin"],
        "gap:approve": ["owner", "admin", "platform_admin"],
        "maturity:approve": ["owner", "admin", "platform_admin"],
        "poam:approve": ["owner", "admin", "platform_admin"],
        "report:approve": ["owner", "admin", "platform_admin"],
      };
      const allowedRoles = gateRoleMap[requiredPermission] ?? [];
      if (!allowedRoles.includes(sessionRole)) {
        throw new ApiError(
          "FORBIDDEN",
          "Approval requires explicit approve permission for this gate.",
          403,
          [{ required_permission: requiredPermission, your_role: sessionRole }],
        );
      }

      const tenantAssessmentsDb = deps.assessments.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const assessment = await tenantAssessmentsDb.get(assessmentId);
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      if (body.target_type === "artifact_version") {
        const tenantArtifactsDb = deps.artifacts.withOrganization(
          requireOrganizationId({ organizationId }),
        );
        const artifact = await tenantArtifactsDb.get(body.target_id);
        if (!artifact || artifact.assessmentId !== assessmentId) {
          throw new ApiError("NOT_FOUND", "Approval target not found.", 404);
        }
      }

      const tenantApprovalsDb = deps.approvals.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const approval = await tenantApprovalsDb.create({
        id: newId(),
        organizationId: assessment.organization_id,
        assessmentId: assessment.assessment_id,
        gate: body.gate,
        decision: body.decision,
        approvedBy: actorId!,
        approvedAt: new Date().toISOString(),
        traceId,
        targetType: body.target_type,
        targetId: body.target_id,
        reason: body.reason,
      });

      return json(approvalResponse(approval), { status: 201 });
    },
  },

  // â”€â”€ List approvals for assessment (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/approvals",
    protected: true,
    permissions: ["approval:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantApprovalsDb = deps.approvals.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const approvals = await tenantApprovalsDb.listByAssessment(
        routeUuidParam(params, "assessmentId"),
      );
      return json({ data: approvals.map(approvalResponse), trace_id: traceId });
    },
  },

  // â”€â”€ Get single approval (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/approvals/:approvalId",
    protected: true,
    permissions: ["approval:read"],
    handler: async ({ deps, params, organizationId }) => {
      const tenantApprovalsDb = deps.approvals.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const approval = await tenantApprovalsDb.get(
        routeUuidParam(params, "approvalId"),
      );
      if (!approval)
        throw new ApiError("NOT_FOUND", "Approval not found.", 404);
      return json(approvalResponse(approval));
    },
  },

  // â”€â”€ NEW: Pending approvals feed (cross-assessment HITL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Closes #83: feed unificado de pendÃªncias por organizaÃ§Ã£o, filtrÃ¡vel por gate
  {
    method: "GET",
    path: "/api/v1/organizations/:orgId/approvals/pending",
    protected: true,
    permissions: ["approval:read"],
    handler: async ({ deps, params, organizationId, traceId, request }) => {
      const orgId = routeUuidParam(params, "orgId");
      const resolvedOrgId = requireOrganizationId({ organizationId });
      // Enforce tenant isolation: requester can only see their own org
      if (orgId !== resolvedOrgId) {
        throw new ApiError(
          "FORBIDDEN",
          "Access denied to this organization.",
          403,
        );
      }

      const url = new URL(request.url);
      const gateFilter = url.searchParams.get("gate") ?? undefined;
      const VALID_GATES = [
        "soa",
        "gap_analysis",
        "maturity_assessment",
        "poam",
        "report",
      ] as const;
      if (
        gateFilter &&
        !VALID_GATES.includes(gateFilter as (typeof VALID_GATES)[number])
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          `Invalid gate filter. Must be one of: ${VALID_GATES.join(", ")}`,
          400,
        );
      }

      const pending = await deps.approvals.listPending(
        resolvedOrgId,
        gateFilter as (typeof VALID_GATES)[number] | undefined,
      );

      return json({
        data: pending.map(approvalResponse),
        count: pending.length,
        trace_id: traceId,
      });
    },
  },

  // â”€â”€ NEW: Approve a specific approval record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Closes #83: SDK sugar approve() â€” exige actor explÃ­cito
  {
    method: "POST",
    path: "/api/v1/approvals/:approvalId/approve",
    protected: true,
    requireActor: true,
    permissions: ["approval:create"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const body = await parseJson(
        request,
        z.object({
          actor: z.string().min(1, "actor is required"),
          reason: z.string().optional(),
        }),
      );
      const approvalId = routeUuidParam(params, "approvalId");
      const resolvedOrgId = requireOrganizationId({ organizationId });

      const tenantApprovalsDb = deps.approvals.withOrganization(resolvedOrgId);
      const existing = await tenantApprovalsDb.get(approvalId);
      if (!existing)
        throw new ApiError("NOT_FOUND", "Approval not found.", 404);
      if (existing.decision !== null && existing.decision !== undefined) {
        throw new ApiError(
          "CONFLICT",
          "This approval gate has already been decided.",
          409,
          [{ current_decision: existing.decision }],
        );
      }

      const updated = await tenantApprovalsDb.create({
        ...existing,
        decision: "approved",
        approvedBy: body.actor,
        approvedAt: new Date().toISOString(),
        reason: body.reason ?? existing.reason,
        traceId,
      });

      return json(approvalResponse(updated));
    },
  },

  // â”€â”€ NEW: Reject a specific approval record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "POST",
    path: "/api/v1/approvals/:approvalId/reject",
    protected: true,
    requireActor: true,
    permissions: ["approval:create"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const body = await parseJson(
        request,
        z.object({
          actor: z.string().min(1, "actor is required"),
          reason: z.string().min(1, "reason is required for rejection"),
        }),
      );
      const approvalId = routeUuidParam(params, "approvalId");
      const resolvedOrgId = requireOrganizationId({ organizationId });

      const tenantApprovalsDb = deps.approvals.withOrganization(resolvedOrgId);
      const existing = await tenantApprovalsDb.get(approvalId);
      if (!existing)
        throw new ApiError("NOT_FOUND", "Approval not found.", 404);
      if (existing.decision !== null && existing.decision !== undefined) {
        throw new ApiError(
          "CONFLICT",
          "This approval gate has already been decided.",
          409,
          [{ current_decision: existing.decision }],
        );
      }

      const updated = await tenantApprovalsDb.create({
        ...existing,
        decision: "rejected",
        approvedBy: body.actor,
        approvedAt: new Date().toISOString(),
        reason: body.reason,
        traceId,
      });

      return json(approvalResponse(updated));
    },
  },
];
