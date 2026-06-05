import { requireApprovalEvent } from "./approvals";
import { AssessmentEngineError } from "./errors";
import { getTransition } from "./transitions";
import { assertPrerequisites } from "./prerequisites";
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
