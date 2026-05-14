import type { AssessmentLifecycleStep } from "@standard/schemas";

export const SYSTEM_ACTOR = "standard-workflow-orchestrator";

export const APPROVAL_STEP_BY_TYPE = {
  soa: "wait_for_soa_approval",
  gap_analysis: "wait_for_gap_approval",
  maturity_assessment: "wait_for_maturity_approval",
  poam: "wait_for_poam_approval",
  report: "wait_for_report_approval"
} as const satisfies Record<string, AssessmentLifecycleStep>;

export const TERMINAL_WORKFLOW_STATUSES = ["completed", "cancelled"] as const;

