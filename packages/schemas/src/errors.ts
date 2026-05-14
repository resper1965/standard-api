import { z } from "zod";
import { TraceIdSchema } from "./common";

export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE_TRANSITION",
  "APPROVAL_REQUIRED",
  "ARTIFACT_IMMUTABLE",
  "TENANT_CONTEXT_REQUIRED",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR"
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.array(z.unknown()).default([]),
    trace_id: TraceIdSchema
  })
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
