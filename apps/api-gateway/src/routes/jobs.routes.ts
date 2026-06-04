import type { RouteDefinition } from "../http";
import { json } from "../http";
import { IntelligenceService } from "../services/intelligence.service";
import { ApiError } from "../errors/api-error";
import { z } from "zod";

export const jobsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/jobs/:job_id",
    protected: true, // Requires auth
    permissions: ["document:read"],
    tenantRequired: true,
    handler: async (ctx) => {
      const jobId = ctx.params["job_id"];
      if (!jobId || !z.string().uuid().safeParse(jobId).success) {
        throw new ApiError("VALIDATION_ERROR", "Invalid job ID provided", 400);
      }

      const intelligenceService = new IntelligenceService(ctx.deps);
      
      try {
        const run = await intelligenceService.getJobStatus(jobId, ctx.organizationId!);
        
        if (!run) {
           throw new ApiError("NOT_FOUND", "Job not found", 404);
        }

        return json({
          job_id: run.agent_run_id,
          status: run.status,
          output: run.status === "completed" ? ((run.metadata as Record<string, unknown>)?.output ?? null) : null,
          created_at: run.started_at,
          updated_at: run.completed_at
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError("INTERNAL_ERROR", "Failed to fetch job status", 500, [
          { details: err instanceof Error ? err.message : String(err) }
        ]);
      }
    }
  }
];
