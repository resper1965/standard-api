// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const ReportVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const ReportTypeSchema = z.enum([
  "full_assessment_report",
  "executive_summary",
  "soa_export",
  "gap_analysis_report",
  "maturity_report",
  "poam_report",
  "audit_package",
  "machine_readable_export"
]);
export const ReportArtifactTypeSchema = z.enum(["report", "export", "evidence_index", "audit_package", "appendix", "summary"]);
export const ReportFormatSchema = z.enum(["json", "markdown", "html", "docx", "pdf", "csv", "xlsx", "zip"]);
export const ExportJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed", "skipped", "cancelled", "retrying"]);

export const CreateReportDraftRequestSchema = z.strictObject({
  report_type: ReportTypeSchema,
  title: z.string().optional(),
  source_soa_version_id: UuidSchema.optional(),
  source_gap_analysis_version_id: UuidSchema.optional(),
  source_maturity_assessment_version_id: UuidSchema.optional(),
  source_poam_version_id: UuidSchema.optional(),
  allow_unapproved_sources: z.boolean().default(false),
  exception_rationale: z.string().optional()
});

export const RegenerateReportRequestSchema = z.strictObject({
  reason: z.string().optional()
});

export const ReportVersionResponseSchema = z.object({
  report_version_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  version_number: z.number().int().positive(),
  status: ReportVersionStatusSchema,
  report_type: ReportTypeSchema,
  title: z.string(),
  source_scope_id: UuidSchema.optional(),
  source_soa_version_id: UuidSchema.optional(),
  source_gap_analysis_version_id: UuidSchema.optional(),
  source_maturity_assessment_version_id: UuidSchema.optional(),
  source_poam_version_id: UuidSchema.optional(),
  framework_id: UuidSchema.optional(),
  scf_version_id: UuidSchema.optional(),
  generated_by_agent_run_id: UuidSchema.optional(),
  created_by: UuidSchema,
  created_at: z.string(),
  submitted_for_review_at: z.string().optional(),
  approved_by: UuidSchema.optional(),
  approved_at: z.string().optional(),
  approval_event_id: UuidSchema.optional(),
  superseded_by: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  metadata: z.object({
    limitations: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    source_status: z.record(z.string(), z.string()).default({})
  }).catchall(z.unknown()).default({ limitations: [], assumptions: [], source_status: {} })
});

export const ReportSectionResponseSchema = z.object({
  section_id: UuidSchema,
  report_version_id: UuidSchema,
  section_key: z.string(),
  title: z.string(),
  order: z.number().int(),
  content: z.record(z.string(), z.unknown()),
  traceability: z.array(z.object({
    source_type: z.string(),
    source_id: z.string()
  })).default([])
});

export const ReportValidationResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  unapproved_sources: z.array(z.string()),
  missing_traceability: z.array(z.string()),
  trace_id: TraceIdSchema
});

export const RenderReportRequestSchema = z.strictObject({
  format: ReportFormatSchema,
  store_artifact: z.boolean().default(true)
});

export const RenderReportResponseSchema = z.object({
  report_version_id: UuidSchema,
  artifact_type: ReportArtifactTypeSchema,
  format: ReportFormatSchema,
  mime_type: z.string(),
  content: z.string(),
  trace_id: TraceIdSchema
});

export const ReportArtifactResponseSchema = z.object({
  report_artifact_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  report_version_id: UuidSchema,
  artifact_type: ReportArtifactTypeSchema,
  format: ReportFormatSchema,
  storage_provider: z.string(),
  storage_bucket: z.string().optional(),
  storage_key: z.string(),
  content_hash: z.string().length(64),
  file_size: z.number().int().nonnegative(),
  mime_type: z.string(),
  generated_at: z.string(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const ExportRequestSchema = z.strictObject({
  report_version_id: UuidSchema.optional(),
  report_type: ReportTypeSchema.default("machine_readable_export"),
  format: ReportFormatSchema.default("json")
});

export const ExportJobResponseSchema = z.object({
  export_job_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  report_version_id: UuidSchema.optional(),
  job_type: z.string(),
  status: ExportJobStatusSchema,
  requested_format: ReportFormatSchema,
  requested_by: UuidSchema,
  queued_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error_code: z.string().optional(),
  error_message_safe: z.string().optional(),
  trace_id: TraceIdSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const SubmitReportReviewRequestSchema = z.strictObject({
  exception_rationale: z.string().optional()
});

export const ApproveReportRequestSchema = z.strictObject({
  approval_event_id: UuidSchema
});

export const EvidenceIndexResponseSchema = z.object({
  report_version_id: UuidSchema,
  entries: z.array(z.object({
    evidence_finding_id: UuidSchema.optional(),
    document_id: UuidSchema.optional(),
    chunk_id: UuidSchema.optional(),
    source_location: z.string().optional(),
    snippet: z.string().optional()
  })),
  trace_id: TraceIdSchema
});

export const TraceabilityAppendixResponseSchema = z.object({
  report_version_id: UuidSchema,
  sources: z.array(z.object({
    source_type: z.string(),
    source_id: z.string(),
    status: z.string().optional()
  })),
  trace_id: TraceIdSchema
});

export const ReportSummaryResponseSchema = z.object({
  assessment_id: UuidSchema,
  report_version_id: UuidSchema,
  report_type: ReportTypeSchema,
  status: ReportVersionStatusSchema,
  artifact_count: z.number().int(),
  trace_id: TraceIdSchema
});

export type ReportVersionStatus = z.infer<typeof ReportVersionStatusSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportArtifactType = z.infer<typeof ReportArtifactTypeSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ExportJobStatus = z.infer<typeof ExportJobStatusSchema>;
export type CreateReportDraftRequest = z.infer<typeof CreateReportDraftRequestSchema>;
export type RegenerateReportRequest = z.infer<typeof RegenerateReportRequestSchema>;
export type ReportVersionResponse = z.infer<typeof ReportVersionResponseSchema>;
export type ReportSectionResponse = z.infer<typeof ReportSectionResponseSchema>;
export type ReportValidationResponse = z.infer<typeof ReportValidationResponseSchema>;
export type RenderReportRequest = z.infer<typeof RenderReportRequestSchema>;
export type RenderReportResponse = z.infer<typeof RenderReportResponseSchema>;
export type ReportArtifactResponse = z.infer<typeof ReportArtifactResponseSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ExportJobResponse = z.infer<typeof ExportJobResponseSchema>;
export type SubmitReportReviewRequest = z.infer<typeof SubmitReportReviewRequestSchema>;
export type ApproveReportRequest = z.infer<typeof ApproveReportRequestSchema>;
export type EvidenceIndexResponse = z.infer<typeof EvidenceIndexResponseSchema>;
export type TraceabilityAppendixResponse = z.infer<typeof TraceabilityAppendixResponseSchema>;
export type ReportSummaryResponse = z.infer<typeof ReportSummaryResponseSchema>;

