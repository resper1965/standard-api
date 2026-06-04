import type {
  ApprovalEvent,
  AssessmentLifecycleEvent,
  AssessmentSnapshot,
  AssessmentState,
  TransitionContext,
  TransitionResult
} from "@standard/assessment-engine";
import type {
  AssessmentLifecycleWorkflowInput,
  AssessmentLifecycleWorkflowState,
  CancelWorkflowRequest,
  ResumeWorkflowRequest,
  WorkflowRunResponse,
  WorkflowRunStatus,
  WorkflowSignalRequest
} from "@standard/schemas";

export type WorkflowAuditEventType =
  | "lifecycle_workflow_started"
  | "lifecycle_workflow_step_started"
  | "lifecycle_workflow_step_completed"
  | "lifecycle_workflow_waiting_for_approval"
  | "lifecycle_workflow_signal_received"
  | "lifecycle_workflow_blocked"
  | "lifecycle_workflow_failed"
  | "lifecycle_workflow_cancelled"
  | "lifecycle_workflow_resumed"
  | "lifecycle_workflow_completed";

export type WorkflowAuditEvent = {
  event_type: WorkflowAuditEventType;
  organization_id: string;
  assessment_id: string;
  workflow_run_id: string;
  step_name?: string;
  actor_id?: string;
  system_actor?: string;
  trace_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type WorkflowRunRecord = WorkflowRunResponse & {
  signal_idempotency_keys: string[];
  step_idempotency_keys: string[];
};

export type WorkflowStartInput = {
  input: AssessmentLifecycleWorkflowInput;
  assessment: AssessmentSnapshot;
};

export type WorkflowSignalInput = {
  run: WorkflowRunRecord;
  signal: WorkflowSignalRequest;
  assessment: AssessmentSnapshot;
  approvalEvent?: ApprovalEvent;
};

export interface TenantScopedWorkflowRepository {
  create(input: WorkflowRunRecord): Promise<WorkflowRunRecord>;
  get(workflowRunId: string): Promise<WorkflowRunRecord | null>;
  getActiveByAssessment(assessmentId: string): Promise<WorkflowRunRecord | null>;
  listByAssessment(assessmentId: string): Promise<WorkflowRunRecord[]>;
  save(record: WorkflowRunRecord): Promise<void>;
}

export type WorkflowRepository = {
  create(input: WorkflowRunRecord): Promise<WorkflowRunRecord>;
  get(workflowRunId: string): Promise<WorkflowRunRecord | null>;
  getActiveByAssessment(assessmentId: string, organizationId: string): Promise<WorkflowRunRecord | null>;
  listByAssessment(assessmentId: string, organizationId: string): Promise<WorkflowRunRecord[]>;
  save(record: WorkflowRunRecord): Promise<void>;
  withOrganization(organizationId: string): TenantScopedWorkflowRepository;
};

export type WorkflowAuditAdapter = {
  record(event: WorkflowAuditEvent): Promise<void>;
};

export type AssessmentEngineAdapter = {
  transition(assessment: AssessmentSnapshot, nextState: AssessmentState, context: TransitionContext): TransitionResult;
  transitions: AssessmentState[];
};

/**
 * Minimal adapter to fetch the authoritative documentCount from persistent
 * storage. Used by the workflow to avoid relying on a potentially stale
 * snapshot that was captured before documents were uploaded.
 *
 * Contract (MUST be respected by all implementations):
 * - Returns `null` if the assessment is not found.
 * - Returns `null` on any internal/DB error — MUST NOT throw.
 * - Callers rely on null-return for graceful fallback; rejection breaks the workflow.
 */
export type AssessmentDocumentCountAdapter = {
  getDocumentCount(assessmentId: string): Promise<number | null>;
};

export type TenantScopedWorkflowDependencies = {
  workflows: TenantScopedWorkflowRepository;
  audit: WorkflowAuditAdapter;
  assessmentEngine: AssessmentEngineAdapter;
  /**
   * Optional adapter to re-fetch documentCount from DB before snapshot-based
   * decisions in progressFromStart. When omitted, the workflow falls back to
   * the snapshot value (pre-fix behaviour).
   *
   * PRODUCTION DI REQUIREMENT: must be injected in all non-test environments.
   * If omitted, the workflow silently uses a potentially stale documentCount.
   * For test contexts without DB, inject a NullAssessmentDocumentCountAdapter
   * that always returns null rather than relying on the field being absent.
   */
  assessments?: AssessmentDocumentCountAdapter | undefined;
};

export type WorkflowDependencies = {
  workflows: WorkflowRepository;
  audit: WorkflowAuditAdapter;
  assessmentEngine: AssessmentEngineAdapter;
};

export type WorkflowMutationResult = {
  run: WorkflowRunRecord;
  assessment: AssessmentSnapshot;
  lifecycleEvents: AssessmentLifecycleEvent[];
};

export type LifecycleCommand =
  | WorkflowSignalRequest
  | CancelWorkflowRequest
  | ResumeWorkflowRequest;

export type WorkflowSafeErrorCode =
  | "TENANT_CONTEXT_REQUIRED"
  | "ASSESSMENT_CONTEXT_MISMATCH"
  | "WORKFLOW_NOT_FOUND"
  | "DUPLICATE_ACTIVE_WORKFLOW"
  | "WORKFLOW_NOT_ACTIVE"
  | "APPROVAL_EVENT_REQUIRED"
  | "WORKFLOW_SIGNAL_NOT_ALLOWED"
  | "WORKFLOW_RESUME_NOT_ALLOWED"
  | "WORKFLOW_BLOCKED"
  | "WORKFLOW_FAILED";

