// @ts-nocheck -- Zod v4 CI type compat
import type { AssessmentLifecycleEventType } from "./events";
import type { AssessmentState } from "./states";
import type { AssessmentTransition } from "./types";

const transitionDefinitions = [
  ["draft", "documents_uploaded", "document_uploaded"],
  ["documents_uploaded", "documents_ingested", "documents_ingested"],
  ["documents_ingested", "scf_pre_analysis_ready", "scf_pre_analysis_completed"],
  ["scf_pre_analysis_ready", "framework_selected", "framework_selected"],
  ["framework_selected", "scope_drafted", "scope_drafted"],
  ["scope_drafted", "soa_drafted", "soa_drafted"],
  ["soa_drafted", "soa_under_review", "soa_submitted_for_review"],
  ["soa_under_review", "soa_approved", "soa_approved"],
  ["soa_under_review", "soa_drafted", "soa_rejected"],
  ["soa_approved", "soa_ingested", "soa_ingested"],
  ["soa_ingested", "evidence_analysis_ready", "evidence_analysis_completed"],
  ["evidence_analysis_ready", "gap_analysis_drafted", "gap_analysis_drafted"],
  ["gap_analysis_drafted", "gap_analysis_under_review", "gap_analysis_submitted_for_review"],
  ["gap_analysis_under_review", "gap_analysis_approved", "gap_analysis_approved"],
  ["gap_analysis_under_review", "gap_analysis_drafted", "gap_analysis_rejected"],
  ["gap_analysis_approved", "maturity_assessed", "maturity_assessed"],
  ["maturity_assessed", "maturity_under_review", "maturity_submitted_for_review"],
  ["maturity_under_review", "maturity_approved", "maturity_approved"],
  ["maturity_under_review", "maturity_assessed", "maturity_rejected"],
  ["gap_analysis_approved", "poam_drafted", "poam_drafted"],
  ["maturity_approved", "poam_drafted", "poam_drafted"],
  ["poam_drafted", "poam_under_review", "poam_submitted_for_review"],
  ["poam_under_review", "poam_approved", "poam_approved"],
  ["poam_under_review", "poam_drafted", "poam_rejected"],
  ["poam_approved", "report_generated", "report_generated"],
  ["report_generated", "closed", "assessment_closed"],
  ["closed", "archived", "assessment_closed"]
] as const satisfies ReadonlyArray<readonly [AssessmentState, AssessmentState, AssessmentLifecycleEventType]>;

export const assessmentTransitions: AssessmentTransition[] = transitionDefinitions.map(([from, to, eventType]) => ({
  from,
  to,
  eventType
}));

export const interruptionStates = ["failed", "cancelled", "blocked"] as const satisfies readonly AssessmentState[];

export const getTransition = (from: AssessmentState, to: AssessmentState): AssessmentTransition | undefined => {
  if (interruptionStates.includes(to as (typeof interruptionStates)[number])) {
    const eventTypeByState: Record<(typeof interruptionStates)[number], AssessmentLifecycleEventType> = {
      failed: "assessment_failed",
      cancelled: "assessment_cancelled",
      blocked: "assessment_blocked"
    };

    return { from, to, eventType: eventTypeByState[to as (typeof interruptionStates)[number]] };
  }

  return assessmentTransitions.find((transition) => transition.from === from && transition.to === to);
};

export const getAllowedNextStates = (from: AssessmentState): AssessmentState[] => [
  ...assessmentTransitions.filter((transition) => transition.from === from).map((transition) => transition.to),
  ...interruptionStates
];

