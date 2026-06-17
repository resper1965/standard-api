export class MaturityError extends Error {
  readonly code: MaturityErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: MaturityErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "MaturityError";
    this.code = code;
    this.details = details;
  }
}

export type MaturityErrorCode =
  | "NO_APPROVED_GAP_ANALYSIS"
  | "VERSION_NOT_FOUND"
  | "VERSION_NOT_EDITABLE"
  | "CLASSIFICATION_FAILED"
  | "TENANT_CONTEXT_MISMATCH"
  | "VALIDATION_FAILED"
  | "INVALID_STATUS_FOR_APPROVAL"
  | "INVALID_STATUS_FOR_REJECTION"
  | "SCORE_NOT_FOUND";

