import { BoardTranslatorUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson } from "../http";

export const executiveRoutes: RouteDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Phase 5: C-Level Board Translator
  // ═══════════════════════════════════════════════════════════════════
  {
    method: "POST",
    path: "/api/v1/executive/translate-risk",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, z.object({
          technicalRiskDescription: z.string().min(10),
          riskCategory: z.enum(["security", "privacy", "compliance", "architecture"]),
          businessContext: z.string().optional()
        }));
        
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new BoardTranslatorUseCase(llmProvider);
        const result = await usecase.translate({
          technicalRiskDescription: body.technicalRiskDescription,
          riskCategory: body.riskCategory,
          ...(body.businessContext ? { businessContext: body.businessContext } : {}),
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("executive.risk.translated", { 
          tenant_id: ctx.tenantId, 
          trace_id: ctx.traceId, 
          category: body.riskCategory,
          urgency: result.urgency_metric
        });
        
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent Board Translation failed", 500);
      }
    },
  },
];
