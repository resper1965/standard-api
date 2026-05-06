import type { ApprovalEvent, AssessmentLifecycleEvent, AssessmentSnapshot, AssessmentState } from "@standard/assessment-engine";
import type {
  AssessmentLifecycleStep,
  AssessmentLifecycleWorkflowInput,
  AssessmentLifecycleWorkflowState,
  CancelWorkflowRequest,
  ResumeWorkflowRequest,
  WorkflowRunResponse,
  WorkflowSignalRequest,
  WorkflowSignalResponse
} from "@standard/schemas";
import { APPROVAL_STEP_BY_TYPE, SYSTEM_ACTOR } from "./constants";
import { WorkflowOrchestrationError } from "./errors";
import type { WorkflowAuditEventType, WorkflowDependencies, WorkflowRunRecord } from "./types";

type ProgressResult = {
  assessment: AssessmentSnapshot;
  events: AssessmentLifecycleEvent[];
};

const now = () => new Date().toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const safeUuid = (): string => crypto.randomUUID();

const toResponse = (run: WorkflowRunRecord): WorkflowRunResponse => ({
  workflow_run_id: run.workflow_run_id,
  status: run.status,
  state: run.state,
  idempotency_key: run.idempotency_key,
  created_at: run.created_at,
  updated_at: run.updated_at
});

const assertSameContext = (input: AssessmentLifecycleWorkflowInput, assessment: AssessmentSnapshot): void => {
  if (
    input.tenant_id !== assessment.tenantId ||
    input.organization_id !== assessment.organizationId ||
    input.assessment_id !== assessment.id
  ) {
    throw new WorkflowOrchestrationError("ASSESSMENT_CONTEXT_MISMATCH", "Workflow input does not match assessment tenancy.", {
      assessment_id: input.assessment_id
    });
  }
};

const approvalForSignal = (signalType: WorkflowSignalRequest["signal_type"]): ApprovalEvent["gate"] | undefined => {
  switch (signalType) {
    case "soa_approved":
      return "soa";
    case "gap_analysis_approved":
      return "gap_analysis";
    case "maturity_approved":
      return "maturity_assessment";
    case "poam_approved":
      return "poam";
    case "report_approved":
      return "report";
    default:
      return undefined;
  }
};

export class AssessmentLifecycleOrchestrator {
  constructor(private readonly deps: WorkflowDependencies) {}

  async start(input: AssessmentLifecycleWorkflowInput, assessment: AssessmentSnapshot): Promise<WorkflowRunResponse> {
    assertSameContext(input, assessment);

    const existing = await this.deps.workflows.getActiveByAssessment(input.assessment_id, input.tenant_id);
    if (existing) {
      if (existing.idempotency_key === input.idempotency_key) return toResponse(existing);
      throw new WorkflowOrchestrationError("DUPLICATE_ACTIVE_WORKFLOW", "Assessment already has an active lifecycle workflow.", {
        workflow_run_id: existing.workflow_run_id
      });
    }

    const timestamp = now();
    const initialState: AssessmentLifecycleWorkflowState = {
      tenant_id: input.tenant_id,
      organization_id: input.organization_id,
      assessment_id: input.assessment_id,
      current_step: "validate_assessment",
      assessment_state: assessment.state,
      scf_version_id: String(input.options.scf_version_id ?? ""),
      trace_id: input.trace_id,
      started_at: timestamp,
      updated_at: timestamp
    };

    const run: WorkflowRunRecord = {
      workflow_run_id: safeUuid(),
      status: "pending",
      state: initialState,
      idempotency_key: input.idempotency_key,
      created_at: timestamp,
      updated_at: timestamp,
      signal_idempotency_keys: [],
      step_idempotency_keys: []
    };

    await this.deps.workflows.create(run);
    await this.audit(run, "lifecycle_workflow_started", input.requested_by, { idempotency_key: input.idempotency_key });

    const { run: progressed } = await this.progressFromStart(run, assessment, input);
    await this.deps.workflows.save(progressed);
    return toResponse(progressed);
  }

  async get(workflowRunId: string, tenantId: string): Promise<WorkflowRunResponse | null> {
    const run = await this.deps.workflows.get(workflowRunId);
    if (!run || run.state.tenant_id !== tenantId) return null;
    return toResponse(run);
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<WorkflowRunResponse[]> {
    return (await this.deps.workflows.listByAssessment(assessmentId, tenantId)).map(toResponse);
  }

  async signal(
    workflowRunId: string,
    signal: WorkflowSignalRequest,
    assessment: AssessmentSnapshot,
    approvalEvent?: ApprovalEvent
  ): Promise<WorkflowSignalResponse> {
    const run = await this.requireRun(workflowRunId);
    this.assertRunAssessmentContext(run, assessment);

    if (run.signal_idempotency_keys.includes(signal.idempotency_key)) {
      return this.toSignalResponse(run, signal.trace_id ?? run.state.trace_id);
    }

    if (["completed", "cancelled"].includes(run.status)) {
      throw new WorkflowOrchestrationError("WORKFLOW_NOT_ACTIVE", "Workflow is not active.", { status: run.status });
    }

    const expectedGate = approvalForSignal(signal.signal_type);
    if (expectedGate && (!approvalEvent || approvalEvent.gate !== expectedGate || approvalEvent.decision !== "approved")) {
      throw new WorkflowOrchestrationError("APPROVAL_EVENT_REQUIRED", "Signal requires a valid approved approval_event.", {
        signal_type: signal.signal_type,
        expected_gate: expectedGate
      });
    }

    run.signal_idempotency_keys.push(signal.idempotency_key);
    await this.audit(run, "lifecycle_workflow_signal_received", signal.actor_id, {
      signal_type: signal.signal_type,
      idempotency_key: signal.idempotency_key
    });

    let updatedRun = run;
    let updatedAssessment = clone(assessment);

    switch (signal.signal_type) {
      case "framework_selected": {
        updatedRun.state.selected_framework_id = String(signal.payload.framework_id ?? "");
        updatedRun.state.scf_version_id = String(signal.payload.scf_version_id ?? updatedRun.state.scf_version_id ?? "");
        ({ run: updatedRun, assessment: updatedAssessment } = await this.advanceToSoaApproval(updatedRun, updatedAssessment, signal.actor_id, signal.idempotency_key, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      }
      case "soa_approved":
        ({ run: updatedRun, assessment: updatedAssessment } = await this.advanceFromApproval(updatedRun, updatedAssessment, "soa_approved", "gap_analysis", signal.actor_id, signal.idempotency_key, approvalEvent!, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      case "gap_analysis_approved":
        ({ run: updatedRun, assessment: updatedAssessment } = await this.advanceFromApproval(updatedRun, updatedAssessment, "gap_analysis_approved", "maturity_assessment", signal.actor_id, signal.idempotency_key, approvalEvent!, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      case "maturity_approved":
        ({ run: updatedRun, assessment: updatedAssessment } = await this.advanceFromApproval(updatedRun, updatedAssessment, "maturity_approved", "poam", signal.actor_id, signal.idempotency_key, approvalEvent!, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      case "poam_approved":
        ({ run: updatedRun, assessment: updatedAssessment } = await this.advanceFromApproval(updatedRun, updatedAssessment, "poam_approved", "report", signal.actor_id, signal.idempotency_key, approvalEvent!, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      case "report_approved":
        ({ run: updatedRun, assessment: updatedAssessment } = await this.closeWithReportApproval(updatedRun, updatedAssessment, signal.actor_id, signal.idempotency_key, approvalEvent!, signal.trace_id ?? updatedRun.state.trace_id));
        break;
      case "assessment_blocked":
        updatedRun = await this.markBlocked(updatedRun, String(signal.payload.blocked_reason ?? "manual_intervention_required"), signal.actor_id);
        break;
      case "assessment_cancelled":
        updatedRun = await this.markCancelled(updatedRun, signal.actor_id, "Assessment cancelled by signal.");
        break;
      case "assessment_resumed":
        updatedRun = await this.resumeRun(updatedRun, signal.actor_id, "Workflow resumed by signal.");
        break;
      default:
        updatedRun.status = "waiting_for_input";
        updatedRun.state.current_step = "wait_for_framework_selection";
        updatedRun.updated_at = now();
        updatedRun.state.updated_at = updatedRun.updated_at;
    }

    await this.deps.workflows.save(updatedRun);
    return this.toSignalResponse(updatedRun, signal.trace_id ?? updatedRun.state.trace_id);
  }

  async cancel(workflowRunId: string, request: CancelWorkflowRequest): Promise<WorkflowRunResponse> {
    const run = await this.requireRun(workflowRunId);
    const cancelled = await this.markCancelled(run, request.actor_id, request.reason);
    await this.deps.workflows.save(cancelled);
    return toResponse(cancelled);
  }

  async resume(workflowRunId: string, request: ResumeWorkflowRequest): Promise<WorkflowRunResponse> {
    const run = await this.requireRun(workflowRunId);
    const resumed = await this.resumeRun(run, request.actor_id, request.reason);
    if (request.from_step) resumed.state.current_step = request.from_step;
    await this.deps.workflows.save(resumed);
    return toResponse(resumed);
  }

  private async progressFromStart(
    run: WorkflowRunRecord,
    assessment: AssessmentSnapshot,
    input: AssessmentLifecycleWorkflowInput
  ): Promise<{ run: WorkflowRunRecord; assessment: AssessmentSnapshot }> {
    let currentRun = clone(run);
    let currentAssessment = clone(assessment);
    currentRun.status = "running";

    if (currentAssessment.state === "draft" && currentAssessment.documentCount > 0) {
      const progressed = await this.transitionSequence(currentRun, currentAssessment, ["documents_uploaded"], input.requested_by, `${input.idempotency_key}:documents_uploaded`, input.trace_id);
      currentRun = progressed.run;
      currentAssessment = progressed.assessment;
    }

    currentRun.status = "waiting_for_input";
    currentRun.state.current_step = "wait_for_documents";
    currentRun.state.assessment_state = currentAssessment.state;
    currentRun.state.last_successful_step = "validate_assessment";
    currentRun.updated_at = now();
    currentRun.state.updated_at = currentRun.updated_at;
    return { run: currentRun, assessment: currentAssessment };
  }

  private async advanceToSoaApproval(
    run: WorkflowRunRecord,
    assessment: AssessmentSnapshot,
    actorId: string,
    idempotencyKey: string,
    traceId: string
  ): Promise<{ run: WorkflowRunRecord; assessment: AssessmentSnapshot }> {
    const progressed = await this.transitionSequence(run, assessment, [
      "documents_ingested",
      "scf_pre_analysis_ready",
      "framework_selected",
      "scope_drafted",
      "soa_drafted",
      "soa_under_review"
    ], actorId, idempotencyKey, traceId);

    progressed.run.status = "waiting_for_approval";
    progressed.run.state.current_step = "wait_for_soa_approval";
    progressed.run.state.pending_approval_type = "soa";
    progressed.run.updated_at = now();
    progressed.run.state.updated_at = progressed.run.updated_at;
    await this.audit(progressed.run, "lifecycle_workflow_waiting_for_approval", actorId, { approval_type: "soa" });
    return progressed;
  }

  private async advanceFromApproval(
    run: WorkflowRunRecord,
    assessment: AssessmentSnapshot,
    approvedState: AssessmentState,
    nextApproval: "gap_analysis" | "maturity_assessment" | "poam" | "report",
    actorId: string,
    idempotencyKey: string,
    approvalEvent: ApprovalEvent,
    traceId: string
  ): Promise<{ run: WorkflowRunRecord; assessment: AssessmentSnapshot }> {
    const sequences: Record<string, AssessmentState[]> = {
      soa_approved: ["soa_approved", "soa_ingested", "evidence_analysis_ready", "gap_analysis_drafted", "gap_analysis_under_review"],
      gap_analysis_approved: ["gap_analysis_approved", "maturity_assessed", "maturity_under_review"],
      maturity_approved: ["maturity_approved", "poam_drafted", "poam_under_review"],
      poam_approved: ["poam_approved", "report_generated"]
    };

    const progressed = await this.transitionSequence(run, assessment, sequences[approvedState] ?? [], actorId, idempotencyKey, traceId, approvalEvent);
    progressed.run.status = "waiting_for_approval";
    progressed.run.state.current_step = APPROVAL_STEP_BY_TYPE[nextApproval];
    progressed.run.state.pending_approval_type = nextApproval;
    progressed.run.updated_at = now();
    progressed.run.state.updated_at = progressed.run.updated_at;
    await this.audit(progressed.run, "lifecycle_workflow_waiting_for_approval", actorId, { approval_type: nextApproval });
    return progressed;
  }

  private async closeWithReportApproval(
    run: WorkflowRunRecord,
    assessment: AssessmentSnapshot,
    actorId: string,
    idempotencyKey: string,
    approvalEvent: ApprovalEvent,
    traceId: string
  ): Promise<{ run: WorkflowRunRecord; assessment: AssessmentSnapshot }> {
    const progressed = await this.transitionSequence(run, assessment, ["closed"], actorId, idempotencyKey, traceId, approvalEvent);
    progressed.run.status = "completed";
    progressed.run.state.current_step = "close_assessment";
    progressed.run.state.pending_approval_type = undefined;
    progressed.run.state.last_successful_step = "close_assessment";
    progressed.run.updated_at = now();
    progressed.run.state.updated_at = progressed.run.updated_at;
    await this.audit(progressed.run, "lifecycle_workflow_completed", actorId, {});
    return progressed;
  }

  private async transitionSequence(
    run: WorkflowRunRecord,
    assessment: AssessmentSnapshot,
    states: AssessmentState[],
    actorId: string,
    baseIdempotencyKey: string,
    traceId: string,
    approvalEvent?: ApprovalEvent
  ): Promise<{ run: WorkflowRunRecord; assessment: AssessmentSnapshot; events: AssessmentLifecycleEvent[] }> {
    let currentRun = clone(run);
    let currentAssessment = clone(assessment);
    const events: AssessmentLifecycleEvent[] = [];

    for (const nextState of states) {
      const stepKey = `${baseIdempotencyKey}:${nextState}`;
      if (currentRun.step_idempotency_keys.includes(stepKey)) continue;

      this.applyPrerequisiteFlags(currentAssessment, nextState);
      await this.audit(currentRun, "lifecycle_workflow_step_started", actorId, { next_state: nextState });

      const transitionContext = {
        tenantId: currentRun.state.tenant_id,
        organizationId: currentRun.state.organization_id,
        assessmentId: currentRun.state.assessment_id,
        actorId,
        reason: `Lifecycle workflow transition to ${nextState}.`,
        traceId,
        occurredAt: now(),
        idempotencyKey: stepKey,
        metadata: { workflow_run_id: currentRun.workflow_run_id }
      };

      const result = this.deps.assessmentEngine.transition(currentAssessment, nextState, approvalEvent ? {
        ...transitionContext,
        approvalEvent
      } : transitionContext);

      currentAssessment = this.applyPostTransitionFlags(result.assessment, nextState);
      currentRun.state.assessment_state = currentAssessment.state;
      currentRun.state.last_successful_step = this.stepForState(nextState);
      currentRun.step_idempotency_keys.push(stepKey);
      currentRun.updated_at = now();
      currentRun.state.updated_at = currentRun.updated_at;
      events.push(result.event);
      await this.audit(currentRun, "lifecycle_workflow_step_completed", actorId, { next_state: nextState });
    }

    return { run: currentRun, assessment: currentAssessment, events };
  }

  private applyPrerequisiteFlags(assessment: AssessmentSnapshot, nextState: AssessmentState): void {
    if (nextState === "documents_ingested") assessment.requiredDocumentJobsComplete = true;
    if (nextState === "scf_pre_analysis_ready") assessment.scfPreAnalysisRegistered = true;
    if (nextState === "framework_selected") assessment.frameworkSelected = true;
    if (nextState === "scope_drafted") assessment.scopeDrafted = true;
    if (nextState === "soa_drafted" || nextState === "soa_under_review") assessment.soaDraftVersionComplete = true;
    if (nextState === "soa_ingested") assessment.soaApproved = true;
    if (nextState === "evidence_analysis_ready") assessment.soaIngested = true;
    if (nextState === "gap_analysis_drafted") {
      assessment.soaApproved = true;
      assessment.gapAnalysisDrafted = true;
    }
    if (nextState === "gap_analysis_under_review") assessment.gapAnalysisDrafted = true;
    if (nextState === "maturity_assessed") {
      assessment.gapAnalysisApproved = true;
      assessment.maturityAssessed = true;
    }
    if (nextState === "maturity_under_review") assessment.maturityAssessed = true;
    if (nextState === "poam_drafted") {
      assessment.gapAnalysisApproved = true;
      assessment.poamDrafted = true;
    }
    if (nextState === "poam_under_review") assessment.poamDrafted = true;
    if (nextState === "report_generated") {
      assessment.soaApproved = true;
      assessment.gapAnalysisApproved = true;
      assessment.maturityApproved = true;
      assessment.poamApproved = true;
    }
    if (nextState === "closed") {
      assessment.reportGenerated = true;
      assessment.reportApproved = true;
    }
  }

  private applyPostTransitionFlags(assessment: AssessmentSnapshot, nextState: AssessmentState): AssessmentSnapshot {
    const updated = clone(assessment);
    if (nextState === "soa_approved") updated.soaApproved = true;
    if (nextState === "soa_ingested") updated.soaIngested = true;
    if (nextState === "evidence_analysis_ready") updated.evidenceAnalysisReady = true;
    if (nextState === "gap_analysis_approved") updated.gapAnalysisApproved = true;
    if (nextState === "maturity_approved") updated.maturityApproved = true;
    if (nextState === "poam_approved") updated.poamApproved = true;
    if (nextState === "report_generated") updated.reportGenerated = true;
    if (nextState === "closed") updated.reportApproved = true;
    return updated;
  }

  private stepForState(state: AssessmentState): AssessmentLifecycleStep {
    const map: Partial<Record<AssessmentState, AssessmentLifecycleStep>> = {
      documents_uploaded: "wait_for_documents",
      documents_ingested: "ingest_documents",
      scf_pre_analysis_ready: "run_scf_pre_analysis",
      framework_selected: "wait_for_framework_selection",
      scope_drafted: "create_scope",
      soa_drafted: "create_soa_draft",
      soa_under_review: "wait_for_soa_approval",
      soa_ingested: "ingest_soa",
      evidence_analysis_ready: "run_evidence_analysis",
      gap_analysis_drafted: "create_gap_analysis",
      gap_analysis_under_review: "wait_for_gap_approval",
      maturity_assessed: "create_maturity_assessment",
      maturity_under_review: "wait_for_maturity_approval",
      poam_drafted: "create_poam",
      poam_under_review: "wait_for_poam_approval",
      report_generated: "create_report",
      closed: "close_assessment"
    };
    return map[state] ?? "validate_assessment";
  }

  private async markBlocked(run: WorkflowRunRecord, reason: string, actorId: string): Promise<WorkflowRunRecord> {
    const updated = clone(run);
    updated.status = "blocked";
    updated.state.blocked_reason = reason === "manual_intervention_required" ? "manual_intervention_required" : "business_prerequisite_missing";
    updated.state.pending_approval_type = undefined;
    updated.updated_at = now();
    updated.state.updated_at = updated.updated_at;
    await this.audit(updated, "lifecycle_workflow_blocked", actorId, { blocked_reason: updated.state.blocked_reason });
    return updated;
  }

  private async markCancelled(run: WorkflowRunRecord, actorId: string, reason: string): Promise<WorkflowRunRecord> {
    const updated = clone(run);
    updated.status = "cancelled";
    updated.state.blocked_reason = "cancelled_by_actor";
    updated.updated_at = now();
    updated.state.updated_at = updated.updated_at;
    await this.audit(updated, "lifecycle_workflow_cancelled", actorId, { reason });
    return updated;
  }

  private async resumeRun(run: WorkflowRunRecord, actorId: string, reason: string): Promise<WorkflowRunRecord> {
    if (!["blocked", "failed"].includes(run.status)) {
      throw new WorkflowOrchestrationError("WORKFLOW_RESUME_NOT_ALLOWED", "Only blocked or failed workflows can be resumed.", {
        status: run.status
      });
    }

    const updated = clone(run);
    updated.status = "running";
    updated.state.blocked_reason = undefined;
    updated.state.failed_reason_safe = undefined;
    updated.updated_at = now();
    updated.state.updated_at = updated.updated_at;
    await this.audit(updated, "lifecycle_workflow_resumed", actorId, { reason });
    return updated;
  }

  private async requireRun(workflowRunId: string): Promise<WorkflowRunRecord> {
    const run = await this.deps.workflows.get(workflowRunId);
    if (!run) throw new WorkflowOrchestrationError("WORKFLOW_NOT_FOUND", "Workflow run not found.", { workflow_run_id: workflowRunId });
    return run;
  }

  private assertRunAssessmentContext(run: WorkflowRunRecord, assessment: AssessmentSnapshot): void {
    if (
      run.state.tenant_id !== assessment.tenantId ||
      run.state.organization_id !== assessment.organizationId ||
      run.state.assessment_id !== assessment.id
    ) {
      throw new WorkflowOrchestrationError("ASSESSMENT_CONTEXT_MISMATCH", "Workflow run does not match assessment tenancy.", {
        workflow_run_id: run.workflow_run_id
      });
    }
  }

  private toSignalResponse(run: WorkflowRunRecord, traceId: string): WorkflowSignalResponse {
    return {
      workflow_run_id: run.workflow_run_id,
      accepted: true,
      status: run.status,
      current_step: run.state.current_step,
      pending_approval_type: run.state.pending_approval_type,
      trace_id: traceId
    };
  }

  private async audit(
    run: WorkflowRunRecord,
    eventType: WorkflowAuditEventType,
    actorId: string | undefined,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.deps.audit.record({
      event_type: eventType,
      tenant_id: run.state.tenant_id,
      organization_id: run.state.organization_id,
      assessment_id: run.state.assessment_id,
      workflow_run_id: run.workflow_run_id,
      step_name: run.state.current_step,
      ...(actorId ? { actor_id: actorId } : { system_actor: SYSTEM_ACTOR }),
      trace_id: run.state.trace_id,
      timestamp: now(),
      metadata
    });
  }
}

