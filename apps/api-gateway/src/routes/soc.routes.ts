import { IncidentTriagerUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson } from "../http";

export const socRoutes: RouteDefinition[] = [
  // ── GET /api/v1/soc/status ────────────────────────────────────────────
  // SOC pipeline health check — used by dashboards and on-call runbooks.
  // Platform admin or tenant admin only (security-sensitive aggregate).
  {
    method: "GET",
    path: "/api/v1/soc/status",
    protected: true,
    requireActor: true,
    permissions: ["admin:write"],
    openapi: {
      tags: ["SOC Monitoring"],
      summary: "SOC pipeline health status",
      description: "Returns SOC monitoring pipeline status: queue binding health, alert service configuration, and pipeline readiness. Requires admin:write permission (platform admin only).",
      responses: {
        200: {
          description: "SOC pipeline status",
          content: { "application/json": { schema: z.object({
            status: z.enum(["operational", "degraded"]),
            timestamp: z.string(),
            pipeline: z.object({
              soc_triage_queue: z.enum(["bound", "unbound"]),
              alert_service: z.enum(["configured", "unconfigured"]),
            }),
            note: z.string(),
            trace_id: z.string(),
          }) } }
        }
      }
    },
    handler: async (ctx) => {
      const now = new Date();
      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Pipeline component status
      const status = {
        timestamp: now.toISOString(),
        pipeline: {
          soc_triage_queue: !!ctx.deps.SOC_TRIAGE_QUEUE ? "bound" : "unbound",
          alert_service: !!ctx.deps.alerts ? "configured" : "unconfigured",
        },
        trace_id: ctx.traceId,
      };

      // Security events summary not available via ObservabilityRepository at this time.
      // Use Cloudflare Logpush / tail workers or query security_events table directly.
      const note = "For detailed security event counts, query the security_events table or Cloudflare Logpush.";

      const isPipelineReady =
        status.pipeline.soc_triage_queue === "bound" &&
        status.pipeline.alert_service === "configured";

      return json({
        status: isPipelineReady ? "operational" : "degraded",
        note,
        ...status,
      });
    },
  },

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
        console.error("[POST /api/v1/soc/triage-incident] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent SOC Incident Triage failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error && e.stack ? [e.stack] : []
        );
      }
    },
  },
];
