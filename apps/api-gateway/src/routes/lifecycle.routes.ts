import { executeTransition, getAllowedNextStates, type ApprovalGate } from "@standard/assessment-engine";
import { TransitionRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { lifecycleEventResponse } from "../presenters";

const gateForState: Partial<Record<string, ApprovalGate>> = {
  soa_approved: "soa",
  gap_analysis_approved: "gap_analysis",
  maturity_approved: "maturity_assessment",
  poam_approved: "poam",
  closed: "report"
};

export const lifecycleRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/transitions",
    protected: true,
    requireActor: true,
    permissions: ["assessment:update"],
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const body = await parseJson(request, TransitionRequestSchema);
      const tenantAssessmentsDb = deps.assessments.withTenant(tenantId!);
      const assessment = await tenantAssessmentsDb.get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const gate = gateForState[body.next_state];
      const tenantApprovalsDb = deps.approvals.withTenant(tenantId!);
      const approvalEvent =
        gate && body.approval_event_id ? await tenantApprovalsDb.getForGate(body.approval_event_id, gate) : undefined;

      const result = executeTransition(assessment.snapshot, body.next_state, {
        tenantId: assessment.tenant_id,
        organizationId: assessment.organization_id,
        assessmentId: assessment.assessment_id,
        actorId: actorId!,
        reason: body.reason,
        traceId,
        occurredAt: new Date().toISOString(),
        ...(approvalEvent ? { approvalEvent } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {})
      });

      const updated = { ...assessment, snapshot: result.assessment, trace_id: traceId };
      await tenantAssessmentsDb.save(updated);
      await deps.lifecycleEvents.withTenant(tenantId!).record(result.event);

      return json({
        assessment_id: assessment.assessment_id,
        tenant_id: assessment.tenant_id,
        organization_id: assessment.organization_id,
        previous_state: result.event.previousState,
        next_state: result.event.nextState,
        event: lifecycleEventResponse(result.event),
        trace_id: traceId
      });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/available-transitions",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const tenantAssessmentsDb = deps.assessments.withTenant(tenantId!);
      const assessment = await tenantAssessmentsDb.get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      return json({
        assessment_id: assessment.assessment_id,
        tenant_id: assessment.tenant_id,
        organization_id: assessment.organization_id,
        current_state: assessment.snapshot.state,
        available_transitions: getAllowedNextStates(assessment.snapshot.state),
        trace_id: traceId
      });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/lifecycle-events",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const tenantLifecycleDb = deps.lifecycleEvents.withTenant(tenantId!);
      const events = await tenantLifecycleDb.listByAssessment(routeParam(params, "assessmentId"));
      return json({ data: events.map(lifecycleEventResponse), trace_id: traceId });
    }
  }
];

