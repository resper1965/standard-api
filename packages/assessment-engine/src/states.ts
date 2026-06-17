export const assessmentStates = [
  "draft",
  "documents_uploaded",
  "documents_ingested",
  "scf_pre_analysis_ready",
  "framework_selected",
  "scope_drafted",
  "soa_drafted",
  "soa_under_review",
  "soa_approved",
  "soa_ingested",
  "evidence_analysis_ready",
  "gap_analysis_drafted",
  "gap_analysis_under_review",
  "gap_analysis_approved",
  "maturity_assessed",
  "maturity_under_review",
  "maturity_approved",
  "poam_drafted",
  "poam_under_review",
  "poam_approved",
  "report_generated",
  "closed",
  "archived",
  "failed",
  "cancelled",
  "blocked"
] as const;

export type AssessmentState = (typeof assessmentStates)[number];

export const terminalAssessmentStates = ["closed", "archived", "failed", "cancelled"] as const;

export const isTerminalAssessmentState = (state: AssessmentState): boolean =>
  terminalAssessmentStates.includes(state as (typeof terminalAssessmentStates)[number]);

