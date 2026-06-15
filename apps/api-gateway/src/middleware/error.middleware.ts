// @ts-nocheck -- Zod v4 CI type compat
import { AssessmentEngineError } from "@standard/assessment-engine";
import { sanitizeErrorDetails } from "@standard/security";
import { ZodError } from "zod";
import { ApiError } from "../errors/api-error";
import { json } from "../http";

export const engineCodeMap = {
  APPROVAL_REQUIRED: ["APPROVAL_REQUIRED", 409],
  ARTIFACT_VERSION_IMMUTABLE: ["ARTIFACT_IMMUTABLE", 409],
  TRANSITION_NOT_ALLOWED: ["INVALID_STATE_TRANSITION", 409],
  MISSING_PREREQUISITE: ["INVALID_STATE_TRANSITION", 409],
  TENANT_CONTEXT_MISMATCH: ["FORBIDDEN", 403],
  APPROVAL_GATE_MISMATCH: ["CONFLICT", 409],
  ARTIFACT_VERSION_NOT_REVIEWABLE: ["CONFLICT", 409],
  ARTIFACT_VERSION_NOT_REJECTED: ["CONFLICT", 409],
  TPRA_SCORE_TOO_LOW: ["BAD_REQUEST", 400],
} as const;

export const errorResponse = (
  error: unknown,
  traceId: string,
  instance: string = "/",
): Response => {
  if (error instanceof ApiError) {
    return json(
      {
        type: `https://api.standard-grc.com/errors/${error.code.toLowerCase()}`,
        title: error.code.replace(/_/g, " "),
        status: error.status,
        detail: error.message,
        instance,
        trace_id: traceId,
        errors: sanitizeErrorDetails(error.details),
      },
      {
        status: error.status,
        headers: { "Content-Type": "application/problem+json" },
      },
    );
  }

  if (error instanceof AssessmentEngineError) {
    const [code, status] = engineCodeMap[error.code] ?? ["INTERNAL_ERROR", 500];
    return json(
      {
        type: `https://api.standard-grc.com/errors/${code.toLowerCase()}`,
        title: code.replace(/_/g, " "),
        status,
        detail: error.message,
        instance,
        trace_id: traceId,
        errors: sanitizeErrorDetails([error.details]),
      },
      { status, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  // â”€â”€ Zod validation errors â†’ 400 (A1 fix) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (error instanceof ZodError) {
    return json(
      {
        type: "https://api.standard-grc.com/errors/validation_error",
        title: "Validation Error",
        status: 400,
        detail: "Request validation failed.",
        instance,
        trace_id: traceId,
        errors: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  // Log the real error for debugging
  console.error(
    `[UNHANDLED_ERROR] trace=${traceId}`,
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack}`
      : String(error),
  );

  return json(
    {
      type: "https://api.standard-grc.com/errors/internal_error",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected API error.",
      instance,
      trace_id: traceId,
      errors: [],
    },
    { status: 500, headers: { "Content-Type": "application/problem+json" } },
  );
};

