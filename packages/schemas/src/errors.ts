import { z } from "zod";
import { TraceIdSchema } from "./common";

/**
 * Canonical set of API error codes.
 * This enum is the single source of truth — the gateway imports from here.
 * Keep in sync with apps/api-gateway/src/errors/error-codes.ts.
 */
export const ApiErrorCodeSchema = z.enum([
  // Generic
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
  "RATE_LIMIT_EXCEEDED",
  "INSUFFICIENT_SCOPE",
  "TENANT_CONTEXT_REQUIRED",
  "TENANT_MISMATCH",
  "ACTOR_REQUIRED",
  "QUEUE_POISONED",
  "UNSUPPORTED_MEDIA_TYPE",
  "FILE_TOO_LARGE",
  "EMAIL_SERVICE_UNAVAILABLE",
  "EMAIL_SEND_FAILED",
  // State machine
  "INVALID_STATE_TRANSITION",
  "APPROVAL_REQUIRED",
  "ARTIFACT_IMMUTABLE",
  "APPROVAL_EVENT_REQUIRED",
  // Scope / SoA
  "NON_APPLICABILITY_RATIONALE_REQUIRED",
  "SCOPE_RATIONALE_REQUIRED",
  "SOA_REVIEW_BLOCKED",
  "SOA_VERSION_IMMUTABLE",
  "APPROVED_SOA_REQUIRED",
  // Evidence
  "EVIDENCE_FINDING_NOT_FOUND",
  // Gap Analysis
  "GAP_ANALYSIS_NOT_FOUND",
  "GAP_FINDING_NOT_FOUND",
  "GAP_ANALYSIS_IMMUTABLE",
  "GAP_RATIONALE_REQUIRED",
  "GAP_REVIEW_BLOCKED",
  "GAP_APPROVAL_BLOCKED",
  "APPROVED_GAP_ANALYSIS_REQUIRED",
  // POA&M
  "POAM_NOT_FOUND",
  "POAM_ITEM_NOT_FOUND",
  "POAM_MILESTONE_NOT_FOUND",
  "POAM_IMMUTABLE",
  "POAM_REVIEW_BLOCKED",
  "POAM_APPROVAL_BLOCKED",
  "POAM_CONTEXT_REQUIRED",
  "POAM_ACTOR_REQUIRED",
  // Reports
  "REPORT_NOT_FOUND",
  "REPORT_ARTIFACT_NOT_FOUND",
  "EXPORT_JOB_NOT_FOUND",
  "REPORT_CONTEXT_REQUIRED",
  "REPORT_ACTOR_REQUIRED",
  "REPORT_IMMUTABLE",
  "REPORT_REVIEW_BLOCKED",
  "REPORT_APPROVAL_BLOCKED",
  "REPORT_FORMAT_NOT_IMPLEMENTED",
  "EXPORT_JOB_FAILED",
  // Organization membership
  /** User tried to join/create a 2nd org when they already belong to one. */
  "SINGLE_ORG_LIMIT",
  /** Route requires an active organization context but none was resolved. */
  "ORGANIZATION_REQUIRED",
  /** User account exists but has not been approved by a platform admin yet. */
  "ACCOUNT_PENDING_APPROVAL",
  // Document security
  /** Uploaded file failed malware scan — rejected by the security pipeline. */
  "MALWARE_DETECTED",
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
