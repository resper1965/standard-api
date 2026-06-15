// @ts-nocheck -- Zod v4 CI type compat
import type { ObservabilityDependencies } from "../repositories";

/**
 * Operational metric helpers for Cloudflare Workers instrumentation.
 * Each function records a typed metric with dimension tags.
 * 
 * These are "fire-and-forget" â€” failures are logged but never thrown
 * to avoid impacting the hot path.
 */

export const recordApiLatency = async (
  deps: Pick<ObservabilityDependencies, "metrics">,
  input: {
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    organizationId?: string;
    traceId: string;
  }
): Promise<void> => {
  try {
    await deps.metrics.create({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      metric_name: "api.request.latency_ms",
      metric_type: "histogram" as const,
      metric_value: input.durationMs,
      unit: "ms",
      dimensions: {
        route: input.route,
        method: input.method,
        status: String(input.statusCode),
      },
      trace_id: input.traceId,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[observability:metrics] Failed to record API latency:", err instanceof Error ? err.message : err);
  }
};

export const recordQueueProcessingTime = async (
  deps: Pick<ObservabilityDependencies, "metrics">,
  input: {
    queueName: string;
    durationMs: number;
    outcome: "success" | "dlq" | "retry";
    organizationId?: string;
    traceId: string;
  }
): Promise<void> => {
  try {
    await deps.metrics.create({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      metric_name: "queue.processing.duration_ms",
      metric_type: "histogram" as const,
      metric_value: input.durationMs,
      unit: "ms",
      dimensions: {
        queue: input.queueName,
        outcome: input.outcome,
      },
      trace_id: input.traceId,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[observability:metrics] Failed to record queue processing:", err instanceof Error ? err.message : err);
  }
};

export const recordMalwareScanResult = async (
  deps: Pick<ObservabilityDependencies, "metrics">,
  input: {
    filename: string;
    outcome: "clean" | "blocked";
    threatCount: number;
    durationMs: number;
    organizationId?: string;
    traceId: string;
  }
): Promise<void> => {
  try {
    await deps.metrics.create({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      metric_name: "malware.scan.result",
      metric_type: "counter" as const,
      metric_value: 1,
      unit: "scans",
      dimensions: {
        outcome: input.outcome,
        threat_count: String(input.threatCount),
        duration_ms: String(input.durationMs),
      },
      trace_id: input.traceId,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[observability:metrics] Failed to record malware scan:", err instanceof Error ? err.message : err);
  }
};

export const recordLlmTokenUsage = async (
  deps: Pick<ObservabilityDependencies, "metrics">,
  input: {
    agentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    organizationId?: string;
    traceId: string;
  }
): Promise<void> => {
  try {
    await deps.metrics.create({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      metric_name: "llm.token.usage",
      metric_type: "counter" as const,
      metric_value: input.inputTokens + input.outputTokens,
      unit: "tokens",
      dimensions: {
        agent_id: input.agentId,
        model: input.model,
        input_tokens: String(input.inputTokens),
        output_tokens: String(input.outputTokens),
      },
      trace_id: input.traceId,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[observability:metrics] Failed to record LLM usage:", err instanceof Error ? err.message : err);
  }
};

