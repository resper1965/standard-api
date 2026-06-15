// @ts-nocheck -- Zod v4 CI type compat
export const MATURITY_REPORT_LIMITATION = "Maturity Assessment not available or not approved; maturity sections are marked as limitation.";
export const POAM_REPORT_LIMITATION = "POA&M not available or not approved; POA&M sections are marked as limitation.";

export const REPORTING_EVENTS = {
  draftCreated: "report_draft_created",
  sourcesValidated: "report_sources_validated",
  renderRequested: "report_render_requested",
  rendered: "report_rendered",
  artifactStored: "report_artifact_stored",
  submittedForReview: "report_submitted_for_review",
  approved: "report_approved",
  superseded: "report_superseded",
  regenerated: "report_regenerated",
  exportRequested: "export_requested",
  exportJobStarted: "export_job_started",
  exportJobCompleted: "export_job_completed",
  exportJobFailed: "export_job_failed",
  downloadUrlGenerated: "report_download_url_generated"
} as const;

