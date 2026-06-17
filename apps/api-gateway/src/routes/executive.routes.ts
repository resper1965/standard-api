import { BoardTranslatorUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, requireOrganizationId } from "../http";

export const executiveRoutes: RouteDefinition[] = [
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 5: C-Level Board Translator
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    method: "POST",
    path: "/api/v1/executive/translate-risk",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          z.object({
            technicalRiskDescription: z.string().min(10),
            riskCategory: z.enum([
              "security",
              "privacy",
              "compliance",
              "architecture",
            ]),
            businessContext: z.string().optional(),
          }),
        );

        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new BoardTranslatorUseCase(llmProvider);
        const result = await usecase.translate({
          technicalRiskDescription: body.technicalRiskDescription,
          riskCategory: body.riskCategory,
          ...(body.businessContext
            ? { businessContext: body.businessContext }
            : {}),
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("executive.risk.translated", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
          category: body.riskCategory,
          urgency: result.urgency_metric,
        });

        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error("[POST /api/v1/executive/translate-risk] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent Board Translation failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
  },
];
