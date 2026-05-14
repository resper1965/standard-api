import { IncidentTriagerUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson } from "../http";

export const socRoutes: RouteDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Phase 4: Incident Response Triager (SOC L3)
  // ═══════════════════════════════════════════════════════════════════
  {
    method: "POST",
    path: "/api/v1/soc/triage-incident",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, z.object({
          systemModuleName: z.string().min(2),
          rawLogsExcerpt: z.string().min(10),
          asyncCall: z.boolean().optional()
        }));
        
        if (body.asyncCall) {
          const job_id = crypto.randomUUID();
          if (ctx.deps.SOC_TRIAGE_QUEUE) {
            await ctx.deps.SOC_TRIAGE_QUEUE.send({
              job_id,
              tenantId: ctx.tenantId!,
              traceId: ctx.traceId,
              systemModuleName: body.systemModuleName,
              rawLogsExcerpt: body.rawLogsExcerpt,
            });
          } else {
            console.warn(`[soc:triage] SOC_TRIAGE_QUEUE not bound — job ${job_id} will not be processed.`);
          }
          return json({ job_id, message: "Accepted for async processing" }, { status: 202 });
        }

        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new IncidentTriagerUseCase(llmProvider);
        const result = await usecase.triage({
          systemModuleName: body.systemModuleName,
          rawLogsExcerpt: body.rawLogsExcerpt,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("soc.incident.triaged", { 
          tenant_id: ctx.tenantId, 
          trace_id: ctx.traceId, 
          module: body.systemModuleName, 
          severity: result.severity_level,
          is_false_positive: result.is_false_positive,
          requires_dpo_notification: result.requires_dpo_breach_notification
        });
        
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent SOC Incident Triage failed", 500);
      }
    },
  },
];
