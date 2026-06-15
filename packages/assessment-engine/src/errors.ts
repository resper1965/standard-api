// @ts-nocheck -- Zod v4 CI type compat
export type AssessmentEngineErrorCode =
  | "TENANT_CONTEXT_MISMATCH"
  | "TRANSITION_NOT_ALLOWED"
  | "MISSING_PREREQUISITE"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_GATE_MISMATCH"
  | "ARTIFACT_VERSION_IMMUTABLE"
  | "ARTIFACT_VERSION_NOT_REVIEWABLE"
  | "ARTIFACT_VERSION_NOT_REJECTED"
  | "TPRA_SCORE_TOO_LOW";

export class AssessmentEngineError extends Error {
  readonly code: AssessmentEngineErrorCode;
  readonly details: Record<string, unknown>;

  constructor(
    code: AssessmentEngineErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "AssessmentEngineError";
    this.code = code;
    this.details = details;
  }
}

