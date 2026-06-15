import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

// Zod v4 type-compatibility helpers for z.record and chained .optional()/.default()
// In some CI environments Zod v4 types resolve ZodString as not satisfying $ZodRecordKey.

const zStr = z.string() as any;

const zUnknown = z.unknown() as any;

const zBool = z.boolean() as any;

export const WorkflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "waiting_for_input",
  "waiting_for_approval",
  "blocked",
  "failed",
  "cancelled",
  "completed",
]);

export const AssessmentLifecycleStepSchema = z.enum([
  "validate_assessment",
  "wait_for_documents",
  "ingest_documents",
  "index_kb",
  "run_scf_pre_analysis",
  "wait_for_framework_selection",
  "create_scope",
  "create_soa_draft",
  "wait_for_soa_approval",
  "ingest_soa",
  "run_evidence_analysis",
  "create_gap_analysis",
  "wait_for_gap_approval",
  "create_maturity_assessment",
  "wait_for_maturity_approval",
  "create_poam",
  "wait_for_poam_approval",
  "create_report",
  "wait_for_report_approval",
  "close_assessment",
]);

export const WorkflowSignalTypeSchema = z.enum([
  "documents_uploaded",
  "documents_ingested",
  "kb_indexed",
  "scf_pre_analysis_completed",
  "framework_selected",
  "scope_approved",
  "soa_approved",
  "gap_analysis_approved",
  "maturity_approved",
  "poam_approved",
  "report_approved",
  "assessment_cancelled",
  "assessment_blocked",
  "assessment_resumed",
]);

export const WorkflowApprovalTypeSchema = z.enum([
  "soa",
  "gap_analysis",
  "maturity_assessment",
  "poam",
  "report",
]);
export const WorkflowBlockedReasonSchema = z.enum([
  "missing_tenant_context",
  "missing_assessment",
  "duplicate_active_workflow",
  "waiting_for_documents",
  "waiting_for_framework_selection",
  "approval_event_invalid",
  "business_prerequisite_missing",
  "manual_intervention_required",
  "cancelled_by_actor",
]);

export const AssessmentLifecycleWorkflowInputSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  requested_by: UuidSchema,
  trace_id: TraceIdSchema,
  idempotency_key: z.string().min(8),
  options: z.record(zStr, zUnknown).default({}),
});

export const AssessmentLifecycleWorkflowStateSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  current_step: AssessmentLifecycleStepSchema,
  assessment_state: z.string().min(1),
  selected_framework_id: (UuidSchema as any).optional(),
  scf_version_id: (UuidSchema as any).optional(),
  scope_id: (UuidSchema as any).optional(),
  soa_version_id: (UuidSchema as any).optional(),
  gap_analysis_version_id: (UuidSchema as any).optional(),
  maturity_assessment_version_id: (UuidSchema as any).optional(),
  poam_version_id: (UuidSchema as any).optional(),
  report_version_id: (UuidSchema as any).optional(),
  pending_approval_type: (WorkflowApprovalTypeSchema as any).optional(),
  blocked_reason: (WorkflowBlockedReasonSchema as any).optional(),
  failed_reason_safe: (z.string().max(500) as any).optional(),
  last_successful_step: (AssessmentLifecycleStepSchema as any).optional(),
  trace_id: TraceIdSchema,
  started_at: z.string(),
  updated_at: z.string(),
});

export const WorkflowStepResultSchema = z.object({
  step_name: AssessmentLifecycleStepSchema,
  status: z.enum(["completed", "waiting", "blocked", "failed", "skipped"]),
  idempotency_key: z.string().min(8),
  trace_id: TraceIdSchema,
  metadata: z.record(zStr, zUnknown).default({}),
});

export const WorkflowSignalRequestSchema = z.strictObject({
  signal_type: WorkflowSignalTypeSchema,
  actor_id: UuidSchema,
  approval_event_id: (UuidSchema as any).optional(),
  idempotency_key: z.string().min(8),
  trace_id: (TraceIdSchema as any).optional(),
  payload: z.record(zStr, zUnknown).default({}),
});

export const StartLifecycleWorkflowRequestSchema = z.strictObject({
  requested_by: UuidSchema,
  idempotency_key: z.string().min(8),
  trace_id: (TraceIdSchema as any).optional(),
  force_restart: zBool.default(false),
  options: z.record(zStr, zUnknown).default({}),
});

export const CancelWorkflowRequestSchema = z.strictObject({
  actor_id: UuidSchema,
  reason: z.string().min(1).max(500),
  idempotency_key: z.string().min(8),
  trace_id: (TraceIdSchema as any).optional(),
});

export const ResumeWorkflowRequestSchema = z.strictObject({
  actor_id: UuidSchema,
  reason: z.string().min(1).max(500),
  idempotency_key: z.string().min(8),
  trace_id: (TraceIdSchema as any).optional(),
  from_step: (AssessmentLifecycleStepSchema as any).optional(),
});

export const WorkflowRunResponseSchema = z.object({
  workflow_run_id: UuidSchema,
  status: WorkflowRunStatusSchema,
  state: AssessmentLifecycleWorkflowStateSchema,
  idempotency_key: z.string().min(8),
  created_at: z.string(),
  updated_at: z.string(),
});

export const StartLifecycleWorkflowResponseSchema = WorkflowRunResponseSchema;

export const WorkflowSignalResponseSchema = z.object({
  workflow_run_id: UuidSchema,
  accepted: z.boolean(),
  status: WorkflowRunStatusSchema,
  current_step: AssessmentLifecycleStepSchema,
  pending_approval_type: (WorkflowApprovalTypeSchema as any).optional(),
  trace_id: TraceIdSchema,
});

export const WorkflowFailureResponseSchema = z.object({
  workflow_run_id: (UuidSchema as any).optional(),
  status: z.enum(["blocked", "failed"]),
  reason_code: z.string().min(1),
  failed_reason_safe: (z.string().max(500) as any).optional(),
  blocked_reason: (WorkflowBlockedReasonSchema as any).optional(),
  trace_id: TraceIdSchema,
});

export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;
export type AssessmentLifecycleStep = z.infer<
  typeof AssessmentLifecycleStepSchema
>;
export type WorkflowSignalType = z.infer<typeof WorkflowSignalTypeSchema>;
export type AssessmentLifecycleWorkflowInput = z.infer<
  typeof AssessmentLifecycleWorkflowInputSchema
>;
export type AssessmentLifecycleWorkflowState = z.infer<
  typeof AssessmentLifecycleWorkflowStateSchema
>;
export type WorkflowSignalRequest = z.infer<typeof WorkflowSignalRequestSchema>;
export type StartLifecycleWorkflowRequest = z.infer<
  typeof StartLifecycleWorkflowRequestSchema
>;
export type CancelWorkflowRequest = z.infer<typeof CancelWorkflowRequestSchema>;
export type ResumeWorkflowRequest = z.infer<typeof ResumeWorkflowRequestSchema>;
export type WorkflowRunResponse = z.infer<typeof WorkflowRunResponseSchema>;
export type WorkflowSignalResponse = z.infer<
  typeof WorkflowSignalResponseSchema
>;
export type WorkflowStepResult = z.infer<typeof WorkflowStepResultSchema>;
