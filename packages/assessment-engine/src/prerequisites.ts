import { AssessmentEngineError } from "./errors";
import type { AssessmentSnapshot } from "./types";
import type { AssessmentState } from "./states";

type PrerequisiteRule = { check: (a: AssessmentSnapshot) => boolean; label: string };

/**
 * Declarative lookup table mapping each target state to the prerequisite
 * checks required before entering it. States absent from this record
 * have no prerequisites and resolve to [].
 */
const prerequisiteRules: Partial<Record<AssessmentState, PrerequisiteRule[]>> = {
  documents_uploaded: [
    { check: (a) => a.documentCount > 0, label: "at_least_one_document" },
  ],
  documents_ingested: [
    { check: (a) => a.requiredDocumentJobsComplete, label: "required_document_jobs_complete_or_skipped" },
  ],
  scf_pre_analysis_ready: [
    { check: (a) => a.scfPreAnalysisRegistered, label: "scf_pre_analysis_registered" },
  ],
  framework_selected: [
    { check: (a) => a.frameworkSelected, label: "framework_selected" },
  ],
  scope_drafted: [
    { check: (a) => a.scopeDrafted, label: "scope_drafted" },
  ],
  soa_drafted: [
    { check: (a) => a.soaDraftVersionComplete, label: "complete_draft_soa_version" },
  ],
  soa_under_review: [
    { check: (a) => a.soaDraftVersionComplete, label: "complete_draft_soa_version" },
  ],
  soa_ingested: [
    { check: (a) => a.soaApproved, label: "soa_approved" },
  ],
  evidence_analysis_ready: [
    { check: (a) => a.soaIngested, label: "soa_ingested_into_kb" },
  ],
  gap_analysis_drafted: [
    { check: (a) => a.soaApproved, label: "soa_approved" },
    { check: (a) => a.gapAnalysisDrafted, label: "gap_analysis_draft_version" },
  ],
  gap_analysis_under_review: [
    { check: (a) => a.gapAnalysisDrafted, label: "gap_analysis_draft_version" },
  ],
  maturity_assessed: [
    { check: (a) => a.gapAnalysisApproved, label: "gap_analysis_approved" },
    { check: (a) => a.maturityAssessed, label: "maturity_assessment_version" },
  ],
  maturity_under_review: [
    { check: (a) => a.maturityAssessed, label: "maturity_assessment_version" },
  ],
  poam_drafted: [
    { check: (a) => a.gapAnalysisApproved, label: "gap_analysis_approved" },
    { check: (a) => a.poamDrafted, label: "poam_draft_version" },
  ],
  poam_under_review: [
    { check: (a) => a.poamDrafted, label: "poam_draft_version" },
  ],
  report_generated: [
    { check: (a) => a.soaApproved, label: "soa_approved" },
    { check: (a) => a.gapAnalysisApproved, label: "gap_analysis_approved" },
    { check: (a) => a.maturityApproved, label: "maturity_approved" },
    { check: (a) => a.poamApproved, label: "poam_approved" },
  ],
  closed: [
    { check: (a) => a.reportGenerated, label: "report_generated" },
    { check: (a) => a.reportApproved, label: "report_approved_or_accepted" },
  ],
};

export const missingPrerequisites = (assessment: AssessmentSnapshot, nextState: AssessmentSnapshot["state"]): string[] => {
  const rules = prerequisiteRules[nextState];
  if (!rules) return [];

  const allPassed = rules.every((r) => r.check(assessment));
  return allPassed ? [] : rules.map((r) => r.label);
};

export const assertPrerequisites = (assessment: AssessmentSnapshot, nextState: AssessmentSnapshot["state"]): void => {
  const missing = missingPrerequisites(assessment, nextState);

  if (missing.length > 0) {
    throw new AssessmentEngineError(
      "MISSING_PREREQUISITE",
      `Transition to ${nextState} is missing prerequisites: ${missing.join(", ")}.`,
      { nextState, missing }
    );
  }
};
