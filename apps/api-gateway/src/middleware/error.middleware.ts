import { AssessmentEngineError } from "@aegis/assessment-engine";
import { sanitizeErrorDetails } from "@aegis/security";
import { ApiError } from "../errors/api-error";
import { json } from "../http";

const engineCodeMap = {
  APPROVAL_REQUIRED: ["APPROVAL_REQUIRED", 409],
  ARTIFACT_VERSION_IMMUTABLE: ["ARTIFACT_IMMUTABLE", 409],
  TRANSITION_NOT_ALLOWED: ["INVALID_STATE_TRANSITION", 409],
  MISSING_PREREQUISITE: ["INVALID_STATE_TRANSITION", 409],
  TENANT_CONTEXT_MISMATCH: ["FORBIDDEN", 403],
  APPROVAL_GATE_MISMATCH: ["CONFLICT", 409],
  ARTIFACT_VERSION_NOT_REVIEWABLE: ["CONFLICT", 409]
} as const;

export const errorResponse = (error: unknown, traceId: string): Response => {
  if (error instanceof ApiError) {
    return json(
      { error: { code: error.code, message: error.message, details: sanitizeErrorDetails(error.details), trace_id: traceId } },
      { status: error.status }
    );
  }

  if (error instanceof AssessmentEngineError) {
    const [code, status] = engineCodeMap[error.code] ?? ["INTERNAL_ERROR", 500];
    return json(
      { error: { code, message: error.message, details: sanitizeErrorDetails([error.details]), trace_id: traceId } },
      { status }
    );
  }

  return json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected API error.",
        details: [],
        trace_id: traceId
      }
    },
    { status: 500 }
  );
};
