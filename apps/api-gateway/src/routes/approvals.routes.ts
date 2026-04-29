import { CreateApprovalRequestSchema } from "@aegis/schemas";
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
    handler: async ({ request, deps, params, tenantId, actorId, traceId, auth }) => {
      const body = await parseJson(request, CreateApprovalRequestSchema);
      const permissionByGate = {
        soa: "soa:approve",
        gap_analysis: "gap:approve",
        maturity_assessment: "maturity:approve",
        poam: "poam:approve",
        report: "report:approve"
      } as const;
      const requiredPermission = permissionByGate[body.gate];
      if (!auth?.permissions.includes(requiredPermission)) {
        throw new ApiError("FORBIDDEN", "Approval requires explicit approve permission.", 403, [{ required_permission: requiredPermission }]);
      }
      const assessmentId = routeParam(params, "assessmentId");
      const assessment = await deps.assessments.get(assessmentId, tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      if (body.target_type === "artifact_version") {
        const artifact = await deps.artifacts.get(body.target_id);
        if (!artifact || artifact.assessmentId !== assessmentId || artifact.tenantId !== tenantId) {
          throw new ApiError("NOT_FOUND", "Approval target not found.", 404);
        }
      }
      if (body.target_type === "assessment_state" && body.target_id !== assessmentId) {
        throw new ApiError("VALIDATION_ERROR", "Assessment state approvals must target the assessment id.", 400);
      }

      const approval = await deps.approvals.create({
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
      const approvals = await deps.approvals.listByAssessment(routeParam(params, "assessmentId"), tenantId!);
      return json({ data: approvals.map(approvalResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/approvals/:approvalId",
    protected: true,
    handler: async ({ deps, params, tenantId }) => {
      const approval = await deps.approvals.get(routeParam(params, "approvalId"));
      if (!approval || approval.tenantId !== tenantId) throw new ApiError("NOT_FOUND", "Approval not found.", 404);
      return json(approvalResponse(approval));
    }
  }
];
