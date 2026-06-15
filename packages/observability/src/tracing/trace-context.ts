// @ts-nocheck -- Zod v4 CI type compat
import { ObservabilityTraceContextSchema, type ObservabilityTraceContext } from "@standard/schemas";
import { createTraceId } from "./trace-id";

export type TraceContextInput = Partial<Omit<ObservabilityTraceContext, "trace_id" | "started_at">> & {
  trace_id?: string;
  started_at?: string;
};

export const createTraceContext = (input: TraceContextInput = {}): ObservabilityTraceContext =>
  ObservabilityTraceContextSchema.parse({
    ...input,
    trace_id: input.trace_id ?? createTraceId(),
    started_at: input.started_at ?? new Date().toISOString()
  });


