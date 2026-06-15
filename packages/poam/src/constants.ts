// @ts-nocheck -- Zod v4 CI type compat
export const POAM_EVENTS = {
  draftCreated: "poam_draft_created",
  itemCreated: "poam_item_created",
  itemUpdated: "poam_item_updated",
  milestoneCreated: "poam_milestone_created",
  milestoneUpdated: "poam_milestone_updated",
  dependenciesDetected: "poam_dependencies_detected",
  validated: "poam_validated",
  submittedForReview: "poam_submitted_for_review",
  approved: "poam_approved",
  superseded: "poam_superseded",
  regenerated: "poam_regenerated"
} as const;

export const MATURITY_UNAVAILABLE_LIMITATION = "Maturity Assessment not available; prioritization used Gap Analysis and SCF context only.";

