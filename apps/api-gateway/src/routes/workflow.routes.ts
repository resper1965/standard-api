import type { ApprovalGate } from "@standard/assessment-engine";
import { AuditEventService, MetricsService } from "@standard/observability";
import { AssessmentLifecycleOrchestrator, WorkflowOrchestrationError } from "@standard/workflows";
import {
  CancelWorkflowRequestSchema,
  ResumeWorkflowRequestSchema,
  StartLifecycleWorkflowRequestSchema,
  WorkflowSignalRequestSchema
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import type { TenantScopedWorkflowDependencies } from "@standard/workflows";

const toApiError = (error: unknown): never => {
  if (error instanceof WorkflowOrchestrationError) {
    const status = error.code === "WORKFLOW_NOT_FOUND" ? 404 : error.code.includes("DUPLICATE") ? 409 : 400;
    const apiCode: ApiErrorCode =
      error.code === "APPROVAL_EVENT_REQUIRED" ? "APPROVAL_EVENT_REQUIRED" :
      error.code === "ASSESSMENT_CONTEXT_MISMATCH" ? "INVALID_STATE_TRANSITION" :
      error.code === "DUPLICATE_ACTIVE_WORKFLOW" ? "CONFLICT" :
      error.code === "WORKFLOW_NOT_FOUND" ? "NOT_FOUND" :
      "VALIDATION_ERROR";
    throw new ApiError(apiCode, error.message.replace(`${error.code}: `, ""), status, [error.details]);
  }
  throw error;
};

const requireAssessment = async (deps: AppDependencies, assessmentId: string, tenantId: string): Promise<AssessmentRecord> => {
  const tenantAssessmentsDb = deps.assessments.withTenant(tenantId);
  const assessment = await tenantAssessmentsDb.get(assessmentId);
  if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

const getTenantWorkflowDeps = (deps: AppDependencies, tenantId: string): TenantScopedWorkflowDependencies => ({
  ...deps.workflows,
  workflows: deps.workflows.workflows.withTenant(tenantId)
});

const approvalGateForSignal = (signalType: string): ApprovalGate | undefined => {
  const gates: Record<string, ApprovalGate> = {
    soa_approved: "soa",
    gap_analysis_approved: "gap_analysis",
    maturity_approved: "maturity_assessment",
    poam_approved: "poam",
    report_approved: "report"
  };
  return gates[signalType];
};

const syncAssessmentState = async (deps: AppDependencies, assessment: AssessmentRecord, assessmentState: string, tenantId: string): Promise<void> => {
  assessment.snapshot = { ...assessment.snapshot, state: assessmentState as AssessmentRecord["snapshot"]["state"] };
  await deps.assessments.withTenant(tenantId).save(assessment);
};

export const workflowRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/workflows/lifecycle/start",
    protected: true,
    requireActor: true,
    permissions: ["assessment:run_workflow"],
    handler: async ({ request, params, deps, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = await parseJson(request, StartLifecycleWorkflowRequestSchema);

      try {
        const orchestrator = new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!));
        const run = await orchestrator.start({
          tenant_id: assessment.tenant_id,
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          requested_by: body.requested_by ?? actorId!,
          trace_id: body.trace_id ?? traceId,
          idempotency_key: body.idempotency_key,
          options: { ...body.options, scf_version_id: assessment.scf_version_id }
        }, assessment.snapshot);
        await new AuditEventService(deps.observability).record({
          tenant_id: assessment.tenant_id,
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          actor_id: actorId!,
          action: "workflow_started",
          resource_type: "workflow_run",
          resource_id: run.workflow_run_id,
          outcome: "success",
          trace_id: traceId,
          metadata_safe: { status: run.status, current_step: run.state.current_step }
        });
        await new MetricsService(deps.observability).record({
          tenant_id: assessment.tenant_id,
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          metric_name: "workflow_run_count",
          metric_type: "counter",
          metric_value: 1,
          unit: "count",
          dimensions: { status: run.status },
          trace_id: traceId
        });
        await syncAssessmentState(deps, assessment, run.state.assessment_state, tenantId!);
        return json(run, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/workflows/lifecycle",
    protected: true,
    handler: async ({ params, deps, tenantId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const runs = await new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!)).listByAssessment(assessment.assessment_id);
      return json({ workflow_runs: runs });
    }
  },
  {
    method: "GET",
    path: "/api/v1/workflows/:workflowRunId",
    protected: true,
    handler: async ({ params, deps, tenantId }) => {
      const run = await new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!)).get(routeParam(params, "workflowRunId"));
      if (!run) throw new ApiError("NOT_FOUND", "Workflow run not found.", 404);
      return json(run);
    }
  },
  {
    method: "POST",
    path: "/api/v1/workflows/:workflowRunId/cancel",
    protected: true,
    requireActor: true,
    permissions: ["assessment:cancel"],
    handler: async ({ request, params, deps, tenantId }) => {
      const body = await parseJson(request, CancelWorkflowRequestSchema);
      try {
        return json(await new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!)).cancel(routeParam(params, "workflowRunId"), body));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/workflows/:workflowRunId/resume",
    protected: true,
    requireActor: true,
    permissions: ["assessment:run_workflow"],
    handler: async ({ request, params, deps, tenantId }) => {
      const body = await parseJson(request, ResumeWorkflowRequestSchema);
      try {
        return json(await new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!)).resume(routeParam(params, "workflowRunId"), body));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/workflows/:workflowRunId/signals",
    protected: true,
    requireActor: true,
    permissions: ["assessment:run_workflow"],
    handler: async ({ request, params, deps, tenantId, traceId }) => {
      const body = await parseJson(request, WorkflowSignalRequestSchema);
      const orchestrator = new AssessmentLifecycleOrchestrator(getTenantWorkflowDeps(deps, tenantId!));
      const run = await orchestrator.get(routeParam(params, "workflowRunId"));
      if (!run) throw new ApiError("NOT_FOUND", "Workflow run not found.", 404);
      const assessment = await requireAssessment(deps, run.state.assessment_id, tenantId!);
      const gate = approvalGateForSignal(body.signal_type);
      const tenantApprovalsDb = deps.approvals.withTenant(tenantId!);
      const approvalEvent = body.approval_event_id && gate ? await tenantApprovalsDb.getForGate(body.approval_event_id, gate) : undefined;

      const stepStartMs = Date.now();
      try {
        const result = await orchestrator.signal(routeParam(params, "workflowRunId"), {
          ...body,
          trace_id: body.trace_id ?? traceId
        }, assessment.snapshot, approvalEvent ?? undefined);
        const updated = await orchestrator.get(routeParam(params, "workflowRunId"));
        if (updated) await syncAssessmentState(deps, assessment, updated.state.assessment_state, tenantId!);
        await new AuditEventService(deps.observability).record({
          tenant_id: assessment.tenant_id,
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          action: updated?.status === "completed" ? "workflow_completed" : "workflow_signal_received",
          resource_type: "workflow_run",
          resource_id: run.workflow_run_id,
          outcome: "success",
          trace_id: traceId,
          metadata_safe: { signal_type: body.signal_type, status: updated?.status ?? run.status }
        });
        await new MetricsService(deps.observability).record({
          tenant_id: assessment.tenant_id,
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          metric_name: "workflow_step_duration_ms",
          metric_type: "histogram",
          metric_value: Date.now() - stepStartMs,
          unit: "ms",
          dimensions: { signal_type: body.signal_type },
          trace_id: traceId
        });
        return json(result, { status: 202 });
      } catch (error) {
        return toApiError(error);
      }
    }
  }
];

