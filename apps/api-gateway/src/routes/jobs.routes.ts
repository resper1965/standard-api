import type { RouteDefinition } from "../http";
import { json, requireOrganizationId } from "../http";
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
        const run = await intelligenceService.getJobStatus(
          jobId,
          requireOrganizationId(ctx),
        );

        if (!run) {
          throw new ApiError("NOT_FOUND", "Job not found", 404);
        }

        return json({
          job_id: run.agent_run_id,
          status: run.status,
          output:
            run.status === "completed"
              ? ((run.metadata as Record<string, unknown>)?.output ?? null)
              : null,
          created_at: run.started_at,
          updated_at: run.completed_at,
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to fetch job status",
          500,
          [{ details: err instanceof Error ? err.message : String(err) }],
        );
      }
    },
  },

  // ── ADR-003: KV-backed polling endpoint for async MCP tool results ─────────
  // Complements the 202 Accepted response from POST /api/v1/mcp/tools/call
  // Clients poll this to get final result when webhook delivery is unavailable.
  {
    method: "GET",
    path: "/api/v1/agent-runs/:jobId",
    protected: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const jobId = ctx.params["jobId"];
      if (!jobId || !z.string().uuid().safeParse(jobId).success) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Invalid job ID — must be a UUID.",
          400,
        );
      }

      const organizationId = requireOrganizationId(ctx);
      const kv = ctx.env?.STANDARD_CACHE;

      if (!kv) {
        // KV not available (local dev without binding) — return pending
        return json(
          {
            job_id: jobId,
            status: "pending",
            result: null,
            message: "KV store not available in this environment.",
          },
          { status: 200 },
        );
      }

      const raw = await kv.get(`agent_run:${jobId}`, "text");

      if (!raw) {
        throw new ApiError(
          "NOT_FOUND",
          `Agent run '${jobId}' not found or has expired.`,
          404,
        );
      }

      let record: {
        job_id: string;
        tool_name: string;
        status: "running" | "completed" | "failed";
        organization_id: string;
        trace_id: string;
        result?: Record<string, unknown>;
        error?: string;
        started_at?: string;
        completed_at?: string;
        failed_at?: string;
        duration_ms?: number;
      };

      try {
        record = JSON.parse(raw);
      } catch {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Corrupt job record in store.",
          500,
        );
      }

      // Tenant isolation — ensure the job belongs to the requesting organization
      if (record.organization_id !== organizationId) {
        throw new ApiError(
          "NOT_FOUND",
          `Agent run '${jobId}' not found or has expired.`,
          404,
        );
      }

      return json(
        {
          job_id: record.job_id,
          tool_name: record.tool_name,
          status: record.status,
          organization_id: record.organization_id,
          trace_id: record.trace_id,
          result:
            record.status === "completed" ? (record.result ?? null) : null,
          error: record.status === "failed" ? (record.error ?? null) : null,
          started_at: record.started_at ?? null,
          completed_at: record.completed_at ?? null,
          failed_at: record.failed_at ?? null,
          duration_ms: record.duration_ms ?? null,
        },
        { status: 200 },
      );
    },
  },
];
