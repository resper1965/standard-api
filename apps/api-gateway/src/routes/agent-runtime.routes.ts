import {
  AgentRuntimeError,
  AgentRuntimeService,
  AGENT_TOOL_CONTRACTS,
  FUNCTIONAL_AGENT_CONTRACTS
} from "@standard/agent-runtime";
import { AuditEventService, CostTrackingService, MetricsService, SecurityEventService } from "@standard/observability";
import {
  CompleteAgentRunRequestSchema,
  InvokeAgentToolRequestSchema,
  StartAgentRunRequestSchema,
  SupportedLocaleSchema
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam, routeUuidParam , requireOrganizationId } from "../http";

const toApiError = (error: unknown): never => {
  if (error instanceof AgentRuntimeError) {
    const status = error.code.includes("NOT_FOUND") ? 404 : error.code.includes("NOT_ALLOWED") || error.code.includes("GUARDRAIL") ? 409 : 400;
    throw new ApiError(error.code as ApiErrorCode, error.message.replace(`${error.code}: `, ""), status, [error.details]);
  }
  throw error;
};

const requireAssessment = async (deps: AppDependencies, assessmentId: string, organizationId: string): Promise<AssessmentRecord> => {
  const assessment = await deps.assessments.withOrganization(organizationId).get(assessmentId);
  if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

const contextFor = (assessment: AssessmentRecord, traceId: string, frameworkId: string, scfVersionId: string, actorId?: string, locale?: string) => ({
  organization_id: assessment.organization_id,
  assessment_id: assessment.assessment_id,
  framework_id: frameworkId,
  scf_version_id: scfVersionId,
  trace_id: traceId,
  ...(actorId ? { actor_id: actorId } : {}),
  ...(locale ? { locale: SupportedLocaleSchema.parse(locale) } : {})
});

const safeTools = () => AGENT_TOOL_CONTRACTS.map((tool) => ({
  tool_name: tool.tool_name,
  description: tool.description,
  risk_level: tool.risk_level
}));

export const agentRuntimeRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/agent-runtime/agents",
    protected: true,
    permissions: ["agent:read"],
    handler: () => json({ agents: FUNCTIONAL_AGENT_CONTRACTS, tools: safeTools() })
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/agent-runs",
    protected: true,
    requireActor: true,
    permissions: ["agent:run"],
    bodySchema: StartAgentRunRequestSchema,
    handler: async ({ validatedBody, params, deps, organizationId, actorId, traceId, request }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      const body = validatedBody as import("@standard/schemas").StartAgentRunRequest;
      const locale = new URL(request.url).searchParams.get("locale") ?? undefined;
      try {
        const runtime = new AgentRuntimeService(deps.agentRuntime);
        const run = await runtime.startRun({
          agent_id: body.agent_id,
          agent_version: body.agent_version,
          prompt_version: body.prompt_version,
          model: body.model,
          input: body.input,
          context: contextFor(assessment, traceId, body.framework_id, body.scf_version_id, actorId!, locale)
        });

        if (deps.AGENT_RUN_QUEUE) {
          await deps.AGENT_RUN_QUEUE.send({
            queue_type: "agent_run",
            agent_run_id: run.agent_run_id,
            organization_id: run.organization_id,
            assessment_id: run.assessment_id
          });
        }

        await new AuditEventService(deps.observability).record({
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          actor_id: actorId!,
          action: "agent_run_started",
          resource_type: "agent_run",
          resource_id: run.agent_run_id,
          outcome: "success",
          trace_id: traceId,
          metadata_safe: { agent_id: run.agent_id, model: run.model }
        });
        await new MetricsService(deps.observability).record({
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          metric_name: "agent_run_count",
          metric_type: "counter",
          metric_value: 1,
          unit: "count",
          dimensions: { agent_id: run.agent_id },
          trace_id: traceId
        });
        return json(run, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/agent-runs",
    protected: true,
    permissions: ["agent:read_runs"],
    handler: async ({ params, deps, organizationId }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      return json(await new AgentRuntimeService(deps.agentRuntime).listRuns(assessment.assessment_id, requireOrganizationId({ organizationId })));
    }
  },
  {
    method: "GET",
    path: "/api/v1/agent-runs/:agentRunId",
    protected: true,
    permissions: ["agent:read"],
    handler: async ({ params, deps, organizationId }) => {
      const run = await new AgentRuntimeService(deps.agentRuntime).getRun(routeUuidParam(params, "agentRunId"), requireOrganizationId({ organizationId }));
      if (!run) throw new ApiError("NOT_FOUND", "Agent run not found.", 404);
      return json(run);
    }
  },
  {
    method: "POST",
    path: "/api/v1/agent-runs/:agentRunId/tool-calls",
    protected: true,
    permissions: ["agent:create"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, traceId }) => {
      const run = await new AgentRuntimeService(deps.agentRuntime).getRun(routeUuidParam(params, "agentRunId"), requireOrganizationId({ organizationId }));
      if (!run) throw new ApiError("NOT_FOUND", "Agent run not found.", 404);
      const body = await parseJson(request, InvokeAgentToolRequestSchema);
      try {
        return json(await new AgentRuntimeService(deps.agentRuntime).invokeTool(run.agent_run_id, {
          tool_name: body.tool_name,
          input: body.input,
          context: {
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
            framework_id: String(run.metadata.framework_id),
            scf_version_id: String(run.metadata.scf_version_id),
            trace_id: traceId
          }
        }), { status: 201 });
      } catch (error) {
        if (error instanceof AgentRuntimeError && error.code === "TOOL_NOT_ALLOWED") {
          await new SecurityEventService(deps.observability).record({
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
            event_type: "tool_use_blocked",
            severity: "medium",
            outcome: "blocked",
            source: "agent-runtime",
            resource_type: "agent_run",
            resource_id: run.agent_run_id,
            message_safe: "Agent tool call blocked by allowlist.",
            trace_id: traceId,
            metadata_safe: { tool_name: body.tool_name, agent_id: run.agent_id }
          });
        }
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/agent-runs/:agentRunId/complete",
    protected: true,
    permissions: ["agent:create"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, traceId }) => {
      const run = await new AgentRuntimeService(deps.agentRuntime).getRun(routeUuidParam(params, "agentRunId"), requireOrganizationId({ organizationId }));
      if (!run) throw new ApiError("NOT_FOUND", "Agent run not found.", 404);
      const body = await parseJson(request, CompleteAgentRunRequestSchema);
      try {
        const completed = await new AgentRuntimeService(deps.agentRuntime).completeRun(run.agent_run_id, {
          output: body.output,
          context: {
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
            framework_id: String(run.metadata.framework_id),
            scf_version_id: String(run.metadata.scf_version_id),
            trace_id: traceId
          }
        });
        await new AuditEventService(deps.observability).record({
          organization_id: run.organization_id,
          assessment_id: run.assessment_id,
          action: "agent_run_completed",
          resource_type: "agent_run",
          resource_id: run.agent_run_id,
          outcome: "success",
          trace_id: traceId,
          metadata_safe: { agent_id: run.agent_id, confidence_score: completed.confidence_score }
        });
        if (body.usage) {
          const totalTokens = body.usage.prompt_tokens + body.usage.completion_tokens + body.usage.embedding_tokens;
          await new CostTrackingService(deps.observability).recordAgentUsage({
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
            agent_run_id: run.agent_run_id,
            model_provider: body.usage.model_provider,
            model_name: run.model,
            prompt_tokens: body.usage.prompt_tokens,
            completion_tokens: body.usage.completion_tokens,
            total_tokens: totalTokens,
            embedding_tokens: body.usage.embedding_tokens,
            estimated_cost: body.usage.estimated_cost,
            currency: body.usage.currency,
            trace_id: traceId
          });
        }
        return json(completed);
      } catch (error) {
        if (error instanceof AgentRuntimeError && error.code.includes("GUARDRAIL")) {
          await new SecurityEventService(deps.observability).record({
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
            event_type: "agent_guardrail_triggered",
            severity: "high",
            outcome: "blocked",
            source: "agent-runtime",
            resource_type: "agent_run",
            resource_id: run.agent_run_id,
            message_safe: "Agent guardrail blocked output.",
            trace_id: traceId,
            metadata_safe: { agent_id: run.agent_id, code: error.code }
          });
        }
        return toApiError(error);
      }
    }
  }
];

