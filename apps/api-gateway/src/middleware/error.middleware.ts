import { AssessmentEngineError } from "@standard/assessment-engine";
import { sanitizeErrorDetails } from "@standard/security";
import { ApiError } from "../errors/api-error";
import { json } from "../http";

const engineCodeMap = {
  APPROVAL_REQUIRED: ["APPROVAL_REQUIRED", 409],
  ARTIFACT_VERSION_IMMUTABLE: ["ARTIFACT_IMMUTABLE", 409],
  TRANSITION_NOT_ALLOWED: ["INVALID_STATE_TRANSITION", 409],
  MISSING_PREREQUISITE: ["INVALID_STATE_TRANSITION", 409],
  TENANT_CONTEXT_MISMATCH: ["FORBIDDEN", 403],
  APPROVAL_GATE_MISMATCH: ["CONFLICT", 409],
  ARTIFACT_VERSION_NOT_REVIEWABLE: ["CONFLICT", 409],
  ARTIFACT_VERSION_NOT_REJECTED: ["CONFLICT", 409]
} as const;

export const errorResponse = (error: unknown, traceId: string, instance: string = "/"): Response => {
  if (error instanceof ApiError) {
    return json(
      {
        type: `https://api.standard-grc.com/errors/${error.code.toLowerCase()}`,
        title: error.code.replace(/_/g, " "),
        status: error.status,
        detail: error.message,
        instance,
        trace_id: traceId,
        errors: sanitizeErrorDetails(error.details)
      },
      { status: error.status, headers: { "Content-Type": "application/problem+json" } }
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
        errors: sanitizeErrorDetails([error.details])
      },
      { status, headers: { "Content-Type": "application/problem+json" } }
    );
  }

  // Log the real error for debugging
  console.error(`[UNHANDLED_ERROR] trace=${traceId}`, error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : String(error));

  return json(
    {
      type: "https://api.standard-grc.com/errors/internal_error",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected API error.",
      instance,
      trace_id: traceId,
      errors: []
    },
    { status: 500, headers: { "Content-Type": "application/problem+json" } }
  );
};

