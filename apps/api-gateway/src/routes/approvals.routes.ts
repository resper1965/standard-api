import { CreateApprovalRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam } from "../http";
import { approvalResponse } from "../presenters";

export const approvalsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/approvals",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId, session }) => {
      const body = await parseJson(request, CreateApprovalRequestSchema);
      const assessmentId = routeParam(params, "assessmentId");

      // Validate target_type / target_id consistency first (400 before 403)
      if (body.target_type === "assessment_state" && body.target_id !== assessmentId) {
        throw new ApiError("VALIDATION_ERROR", "Assessment state approvals must target the assessment id.", 400);
      }

      const permissionByGate = {
        soa: "soa:approve",
        gap_analysis: "gap:approve",
        maturity_assessment: "maturity:approve",
        poam: "poam:approve",
        report: "report:approve"
      } as const;
      const requiredPermission = permissionByGate[body.gate];
      // Use Better Auth session role for RBAC check
      const sessionRole = (session?.user?.role as string | undefined) ?? 'viewer';
      // Map gate-specific permissions to role capability
      const gateRoleMap: Record<string, string[]> = {
        'soa:approve': ['owner', 'admin', 'platform_admin'],
        'gap:approve': ['owner', 'admin', 'platform_admin'],
        'maturity:approve': ['owner', 'admin', 'platform_admin'],
        'poam:approve': ['owner', 'admin', 'platform_admin'],
        'report:approve': ['owner', 'admin', 'platform_admin'],
      };
      const allowedRoles = gateRoleMap[requiredPermission] ?? [];
      const canApprove = allowedRoles.includes(sessionRole);
      if (!canApprove) {
        throw new ApiError("FORBIDDEN", "Approval requires explicit approve permission for this gate.", 403, [{ required_permission: requiredPermission, your_role: sessionRole }]);
      }

      const tenantAssessmentsDb = deps.assessments.withTenant(tenantId!);
      const assessment = await tenantAssessmentsDb.get(assessmentId);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      if (body.target_type === "artifact_version") {
        const tenantArtifactsDb = deps.artifacts.withTenant(tenantId!);
        const artifact = await tenantArtifactsDb.get(body.target_id);
        if (!artifact || artifact.assessmentId !== assessmentId) {
          throw new ApiError("NOT_FOUND", "Approval target not found.", 404);
        }
      }

      const tenantApprovalsDb = deps.approvals.withTenant(tenantId!);
      const approval = await tenantApprovalsDb.create({
        id: newId(),
        tenantId: assessment.tenant_id,
        organizationId: assessment.organization_id,
        assessmentId: assessment.assessment_id,
        gate: body.gate,
        decision: body.decision,
        approvedBy: actorId!,
        approvedAt: new Date().toISOString(),
        traceId,
        targetType: body.target_type,
        targetId: body.target_id,
        reason: body.reason
      });

      return json(approvalResponse(approval), { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/approvals",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const tenantApprovalsDb = deps.approvals.withTenant(tenantId!);
      const approvals = await tenantApprovalsDb.listByAssessment(routeParam(params, "assessmentId"));
      return json({ data: approvals.map(approvalResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/approvals/:approvalId",
    protected: true,
    handler: async ({ deps, params, tenantId }) => {
      const tenantApprovalsDb = deps.approvals.withTenant(tenantId!);
      const approval = await tenantApprovalsDb.get(routeParam(params, "approvalId"));
      if (!approval) throw new ApiError("NOT_FOUND", "Approval not found.", 404);
      return json(approvalResponse(approval));
    }
  }
];

