import { AgentRuntimeService } from "@standard/agent-runtime";
import { AuditEventService, MetricsService } from "@standard/observability";
import { AnalyzeRawTextRequestSchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type {
  AppDependencies,
  AssessmentRecord,
  RouteDefinition,
} from "../http";
import {
  json,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

const requireAssessment = async (
  deps: AppDependencies,
  assessmentId: string,
  organizationId: string,
): Promise<AssessmentRecord> => {
  const assessment = await deps.assessments
    .withOrganization(organizationId)
    .get(assessmentId);
  if (!assessment)
    throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

export const integrationRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/integrations/assessments/:assessmentId/analyze-text",
    protected: true,
    permissions: ["organization:create"],
    requireActor: true,
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const assessment = await requireAssessment(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, AnalyzeRawTextRequestSchema);

      try {
        const runtime = new AgentRuntimeService(deps.agentRuntime);

        // This invokes a fast agent specialized in plain text extraction depending on mode.
        // If mode=consultative, we use standard_consultative_analyst; if strict, standard_gap_analyst
        // We use the framework_id requested by the user, or fallback to the assessment default
        const run = await runtime.startRun({
          agent_id:
            body.mode === "consultative"
              ? "standard-consultative-analyst"
              : "standard-strict-gap-analyst",
          agent_version: "v1",
          prompt_version: "v1",
          model: "standard-ai-gateway/fast",
          input: {
            instruction: `Analyze the following raw text for the requested framework compliance in ${body.mode} mode.`,
            raw_text: body.raw_text,
            context_focus: body.context_focus || [],
          },
          context: {
            organization_id: assessment.organization_id,
            assessment_id: assessment.assessment_id,
            framework_id: body.framework_id || "scf",
            scf_version_id: body.scf_version_id || "2026.1",
            trace_id: traceId,
            actor_id: actorId!,
          },
        });

        // Trigger the async queue so we don't hold the HTTP request open if the text is huge
        if (deps.AGENT_RUN_QUEUE) {
          await deps.AGENT_RUN_QUEUE.send({
            queue_type: "agent_run",
            agent_run_id: run.agent_run_id,
            organization_id: run.organization_id,
            assessment_id: run.assessment_id,
          });
        }

        // Emit observability logs without overkill
        await new AuditEventService(deps.observability).record({
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          actor_id: actorId!,
          action: "integration_text_analysis_started",
          resource_type: "agent_run",
          resource_id: run.agent_run_id,
          outcome: "success",
          trace_id: traceId,
          metadata_safe: {
            mode: body.mode,
            text_size: body.raw_text.length,
            source: "m2m-integration",
          },
        });

        await new MetricsService(deps.observability).record({
          organization_id: assessment.organization_id,
          assessment_id: assessment.assessment_id,
          metric_name: "integration_text_analysis_requests",
          metric_type: "counter",
          metric_value: 1,
          unit: "count",
          dimensions: { mode: body.mode },
          trace_id: traceId,
        });

        return json(
          {
            message: "Analysis run started asynchronously.",
            job: {
              agent_run_id: run.agent_run_id,
              mode: body.mode,
              status: run.status,
            },
            trace_id: traceId,
          },
          { status: 202 },
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new ApiError(
            "INTERNAL_ERROR",
            `Integration analysis failed: ${error.message}`,
            500,
          );
        }
        throw error;
      }
    },
  },
];
