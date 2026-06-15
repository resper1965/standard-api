// @ts-nocheck -- Zod v4 CI type compat
import { AssessmentEngineError } from "./errors";
import type { AssessmentState } from "./states";
import type { ApprovalEvent, ApprovalGate } from "./types";

const approvalGateByState: Partial<Record<AssessmentState, ApprovalGate>> = {
  soa_approved: "soa",
  gap_analysis_approved: "gap_analysis",
  maturity_approved: "maturity_assessment",
  poam_approved: "poam",
  closed: "report"
};

export const requiresApprovalGate = (state: AssessmentState): ApprovalGate | undefined => approvalGateByState[state];

export const requireApprovalEvent = (targetState: AssessmentState, approvalEvent?: ApprovalEvent): void => {
  const gate = requiresApprovalGate(targetState);

  if (!gate) {
    return;
  }

  if (!approvalEvent || approvalEvent.decision !== "approved") {
    throw new AssessmentEngineError(
      "APPROVAL_REQUIRED",
      `Transition to ${targetState} requires an approved ${gate} approval_event.`,
      { targetState, gate }
    );
  }

  if (approvalEvent.gate !== gate) {
    throw new AssessmentEngineError(
      "APPROVAL_GATE_MISMATCH",
      `Approval gate ${approvalEvent.gate} cannot approve transition requiring ${gate}.`,
      { targetState, expectedGate: gate, actualGate: approvalEvent.gate }
    );
  }
};

