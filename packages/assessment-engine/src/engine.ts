import { requireApprovalEvent } from "./approvals";
import { AssessmentEngineError } from "./errors";
import { getTransition } from "./transitions";
import type { AssessmentSnapshot, TransitionContext, TransitionResult } from "./types";

const assertTenantContext = (assessment: AssessmentSnapshot, context: TransitionContext): void => {
  const matches =
    assessment.id === context.assessmentId &&
    assessment.organizationId === context.organizationId &&
    assessment.organizationId === context.organizationId;

  if (!matches) {
    throw new AssessmentEngineError("TENANT_CONTEXT_MISMATCH", "Transition context does not match assessment tenancy.", {
      assessmentId: assessment.id,
      contextAssessmentId: context.assessmentId,
      organizationId: assessment.organizationId,
      contextTenantId: context.organizationId
    });
  }
};

const assertPrerequisites = (assessment: AssessmentSnapshot, nextState: AssessmentSnapshot["state"]): void => {
  const missing = missingPrerequisites(assessment, nextState);

  if (missing.length > 0) {
    throw new AssessmentEngineError(
      "MISSING_PREREQUISITE",
      `Transition to ${nextState} is missing prerequisites: ${missing.join(", ")}.`,
      { nextState, missing }
    );
  }
};

const missingPrerequisites = (assessment: AssessmentSnapshot, nextState: AssessmentSnapshot["state"]): string[] => {
  switch (nextState) {
    case "documents_uploaded":
      return assessment.documentCount > 0 ? [] : ["at_least_one_document"];
    case "documents_ingested":
      return assessment.requiredDocumentJobsComplete ? [] : ["required_document_jobs_complete_or_skipped"];
    case "scf_pre_analysis_ready":
      return assessment.scfPreAnalysisRegistered ? [] : ["scf_pre_analysis_registered"];
    case "framework_selected":
      return assessment.frameworkSelected ? [] : ["framework_selected"];
    case "scope_drafted":
      return assessment.scopeDrafted ? [] : ["scope_drafted"];
    case "soa_drafted":
    case "soa_under_review":
      return assessment.soaDraftVersionComplete ? [] : ["complete_draft_soa_version"];
    case "soa_ingested":
      return assessment.soaApproved ? [] : ["soa_approved"];
    case "evidence_analysis_ready":
      return assessment.soaIngested ? [] : ["soa_ingested_into_kb"];
    case "gap_analysis_drafted":
      return assessment.soaApproved && assessment.gapAnalysisDrafted
        ? []
        : ["soa_approved", "gap_analysis_draft_version"];
    case "gap_analysis_under_review":
      return assessment.gapAnalysisDrafted ? [] : ["gap_analysis_draft_version"];
    case "maturity_assessed":
      return assessment.gapAnalysisApproved && assessment.maturityAssessed
        ? []
        : ["gap_analysis_approved", "maturity_assessment_version"];
    case "maturity_under_review":
      return assessment.maturityAssessed ? [] : ["maturity_assessment_version"];
    case "poam_drafted":
      return assessment.gapAnalysisApproved && assessment.poamDrafted ? [] : ["gap_analysis_approved", "poam_draft_version"];
    case "poam_under_review":
      return assessment.poamDrafted ? [] : ["poam_draft_version"];
    case "report_generated":
      return assessment.soaApproved && assessment.gapAnalysisApproved && assessment.maturityApproved && assessment.poamApproved
        ? []
        : ["soa_approved", "gap_analysis_approved", "maturity_approved", "poam_approved"];
    case "closed":
      return assessment.reportGenerated && assessment.reportApproved ? [] : ["report_generated", "report_approved_or_accepted"];
    default:
      return [];
  }
};

export const validateTransition = (
  assessment: AssessmentSnapshot,
  nextState: AssessmentSnapshot["state"],
  context: TransitionContext
): void => {
  assertTenantContext(assessment, context);

  const transition = getTransition(assessment.state, nextState);
  if (!transition) {
    throw new AssessmentEngineError(
      "TRANSITION_NOT_ALLOWED",
      `Transition ${assessment.state} -> ${nextState} is not allowed.`,
      { previousState: assessment.state, nextState }
    );
  }

  assertPrerequisites(assessment, nextState);
  requireApprovalEvent(nextState, context.approvalEvent);
};

export const executeTransition = (
  assessment: AssessmentSnapshot,
  nextState: AssessmentSnapshot["state"],
  context: TransitionContext
): TransitionResult => {
  validateTransition(assessment, nextState, context);

  const transition = getTransition(assessment.state, nextState);
  if (!transition) {
    throw new AssessmentEngineError("TRANSITION_NOT_ALLOWED", "Transition disappeared after validation.");
  }

  const event = {
    organizationId: context.organizationId,
    assessmentId: context.assessmentId,
    previousState: assessment.state,
    nextState,
    eventType: transition.eventType,
    reason: context.reason,
    timestamp: context.occurredAt,
    traceId: context.traceId,
    metadata: context.metadata ?? {},
    ...(context.actorId ? { actorId: context.actorId } : {}),
    ...(context.systemActor ? { systemActor: context.systemActor } : {}),
    ...(context.idempotencyKey ? { idempotencyKey: context.idempotencyKey } : {})
  };

  return {
    assessment: { ...assessment, state: nextState },
    event
  };
};
