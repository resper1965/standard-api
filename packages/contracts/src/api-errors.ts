/**
 * @module @standard/contracts — API Error Contracts
 * Standardised error types consumed by API gateway, workers, and external clients.
 * Source of truth for error codes lives in @standard/schemas; these are the wire-format types.
 */

// ── Error Codes ────────────────────────────────────────────────────────────────

/**
 * Re-exported from @standard/schemas for convenience.
 * Canonical error code enum stays in schemas; this package provides the wire types.
 */
export type { ApiErrorCode } from "@standard/schemas";

// ── Wire-Format Error ────────────────────────────────────────────────────────

/**
 * Standard API error response body.
 * All error responses from the API gateway follow this shape.
 */
export type ApiErrorResponse = {
  error: {
    /** Machine-readable error code from the canonical enum. */
    code: string;
    /** Human-readable error message (safe for display). */
    message: string;
    /** Structured error details (validation errors, context, etc.). */
    details: unknown[];
    /** Trace ID for correlating with server logs. */
    trace_id: string;
  };
};

// ── Domain-Specific Error Metadata ──────────────────────────────────────────

/** Additional metadata for validation errors. */
export type ValidationErrorDetail = {
  field: string;
  message: string;
  code?: string;
};

/** Additional metadata for approval gate errors. */
export type ApprovalGateErrorDetail = {
  gate: string;
  reason: string;
  required_approver_role?: string;
};

/** Additional metadata for state machine transition errors. */
export type StateTransitionErrorDetail = {
  current_state: string;
  attempted_transition: string;
  allowed_transitions: string[];
};
