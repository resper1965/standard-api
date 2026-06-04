/**
 * @module reporting.repository
 * @description Drizzle PostgreSQL repositories for Reporting.
 * Uses $inferSelect for type-safe row mapping.
 */
import { eq, and } from "drizzle-orm";
import { reportVersions, reportArtifacts, exportJobs } from "@standard/schemas";
import type { ReportVersionResponse, ReportArtifactResponse, ExportJobResponse } from "@standard/schemas";
import type { ReportVersionRepository, ReportArtifactRepository, ExportJobRepository, ReportRepositories } from "@standard/reporting";
import type { DbClient } from "./db";

const createDrizzleReportVersionRepository = (db: DbClient): ReportVersionRepository => ({
  async save(version: ReportVersionResponse) {
    await db.insert(reportVersions).values({
      id: version.report_version_id,
      organizationId: version.organization_id,
      assessmentId: version.assessment_id,
      versionNumber: version.version_number,
      reportType: version.report_type,
      title: version.title,
      status: version.status,
      sourceScopeId: version.source_scope_id,
      sourceSoaVersionId: version.source_soa_version_id,
      sourceGapAnalysisVersionId: version.source_gap_analysis_version_id,
      sourceMaturityAssessmentVersionId: version.source_maturity_assessment_version_id,
      sourcePoamVersionId: version.source_poam_version_id,
      frameworkId: version.framework_id,
      scfVersionId: version.scf_version_id,
      generatedByAgentRunId: version.generated_by_agent_run_id,
      createdBy: version.created_by,
      traceId: version.trace_id,
      metadata: version.metadata,
    }).onConflictDoNothing();
  },
  async update(version: ReportVersionResponse) {
    await db.update(reportVersions).set({
      status: version.status,
      title: version.title,
      submittedForReviewAt: version.submitted_for_review_at ? new Date(version.submitted_for_review_at) : undefined,
      approvedBy: version.approved_by,
      approvedAt: version.approved_at ? new Date(version.approved_at) : undefined,
      approvalEventId: version.approval_event_id,
      supersededBy: version.superseded_by,
      metadata: version.metadata,
      updatedAt: new Date(),
    }).where(eq(reportVersions.id, version.report_version_id));
  },
  async get(reportVersionId, organizationId) {
    const [row] = await db.select().from(reportVersions)
      .where(eq(reportVersions.id, reportVersionId))
      .limit(1);
    return row ? mapReportVersionRow(row) : null;
  },
  async listByAssessment(assessmentId, organizationId) {
    const rows = await db.select().from(reportVersions)
      .where(eq(reportVersions.assessmentId, assessmentId));
    return rows.map(mapReportVersionRow);
  },
});

const createDrizzleReportArtifactRepository = (db: DbClient): ReportArtifactRepository => ({
  async save(artifact: ReportArtifactResponse) {
    await db.insert(reportArtifacts).values({
      id: artifact.report_artifact_id,
      organizationId: artifact.organization_id,
      assessmentId: artifact.assessment_id,
      reportVersionId: artifact.report_version_id,
      artifactType: artifact.artifact_type as "report" | "export" | "evidence_index" | "audit_package" | "appendix" | "summary",
      format: artifact.format as "json" | "markdown" | "html" | "docx" | "pdf" | "csv" | "xlsx" | "zip",
      storageProvider: artifact.storage_provider as "r2" | "external" | "r2_compatible_mock",
      storageBucket: artifact.storage_bucket,
      storageKey: artifact.storage_key,
      contentHash: artifact.content_hash,
      mimeType: artifact.mime_type,
      fileSize: artifact.file_size,
      metadata: artifact.metadata ?? {},
    }).onConflictDoNothing();
  },
  async get(artifactId, organizationId) {
    const [row] = await db.select().from(reportArtifacts)
      .where(eq(reportArtifacts.id, artifactId))
      .limit(1);
    return row ? mapReportArtifactRow(row) : null;
  },
  async listByReport(reportVersionId, organizationId) {
    const rows = await db.select().from(reportArtifacts)
      .where(eq(reportArtifacts.reportVersionId, reportVersionId));
    return rows.map(mapReportArtifactRow);
  },
});

const createDrizzleExportJobRepository = (db: DbClient): ExportJobRepository => ({
  async save(job: ExportJobResponse) {
    await db.insert(exportJobs).values({
      id: job.export_job_id,
      organizationId: job.organization_id,
      assessmentId: job.assessment_id,
      reportVersionId: job.report_version_id,
      jobType: job.job_type,
      status: job.status,
      requestedFormat: job.requested_format,
      requestedBy: job.requested_by,
      traceId: job.trace_id,
      metadata: job.metadata ?? {},
    }).onConflictDoNothing();
  },
  async update(job: ExportJobResponse) {
    await db.update(exportJobs).set({
      status: job.status,
      startedAt: job.started_at ? new Date(job.started_at) : undefined,
      completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
      errorCode: job.error_code,
      errorMessageSafe: job.error_message_safe,
      metadata: job.metadata ?? {},
    }).where(eq(exportJobs.id, job.export_job_id));
  },
  async get(exportJobId, organizationId) {
    const [row] = await db.select().from(exportJobs)
      .where(eq(exportJobs.id, exportJobId))
      .limit(1);
    return row ? mapExportJobRow(row) : null;
  },
  async listByAssessment(assessmentId, organizationId) {
    const rows = await db.select().from(exportJobs)
      .where(eq(exportJobs.assessmentId, assessmentId));
    return rows.map(mapExportJobRow);
  },
});

export const createDrizzleReportRepositories = (db: DbClient): ReportRepositories => ({
  versions: createDrizzleReportVersionRepository(db),
  artifacts: createDrizzleReportArtifactRepository(db),
  exportJobs: createDrizzleExportJobRepository(db),
});

// --- Row mappers ---

type ReportVersionRow = typeof reportVersions.$inferSelect;
type ReportArtifactRow = typeof reportArtifacts.$inferSelect;
type ExportJobRow = typeof exportJobs.$inferSelect;

const mapReportVersionRow = (row: ReportVersionRow): ReportVersionResponse => ({
  report_version_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status as ReportVersionResponse["status"],
  report_type: row.reportType,
  title: row.title,
  source_scope_id: row.sourceScopeId ?? undefined,
  source_soa_version_id: row.sourceSoaVersionId ?? undefined,
  source_gap_analysis_version_id: row.sourceGapAnalysisVersionId ?? undefined,
  source_maturity_assessment_version_id: row.sourceMaturityAssessmentVersionId ?? undefined,
  source_poam_version_id: row.sourcePoamVersionId ?? undefined,
  framework_id: row.frameworkId ?? undefined,
  scf_version_id: row.scfVersionId ?? undefined,
  generated_by_agent_run_id: row.generatedByAgentRunId ?? undefined,
  created_by: row.createdBy ?? "system",
  created_at: row.createdAt.toISOString(),
  submitted_for_review_at: row.submittedForReviewAt?.toISOString(),
  approved_by: row.approvedBy ?? undefined,
  approved_at: row.approvedAt?.toISOString(),
  approval_event_id: row.approvalEventId ?? undefined,
  superseded_by: row.supersededBy ?? undefined,
  trace_id: row.traceId,
  metadata: {
    limitations: ((row.metadata as Record<string, unknown>)?.limitations as string[]) ?? [],
    assumptions: ((row.metadata as Record<string, unknown>)?.assumptions as string[]) ?? [],
    source_status: ((row.metadata as Record<string, unknown>)?.source_status as Record<string, string>) ?? {},
  },
});

const mapReportArtifactRow = (row: ReportArtifactRow): ReportArtifactResponse => ({
  report_artifact_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  report_version_id: row.reportVersionId,
  artifact_type: row.artifactType,
  format: row.format,
  storage_provider: row.storageProvider,
  storage_bucket: row.storageBucket ?? undefined,
  storage_key: row.storageKey,
  content_hash: row.contentHash,
  file_size: row.fileSize,
  mime_type: row.mimeType,
  generated_at: row.generatedAt.toISOString(),
  created_at: row.createdAt.toISOString(),
  metadata: row.metadata ?? {},
});

const mapExportJobRow = (row: ExportJobRow): ExportJobResponse => ({
  export_job_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  report_version_id: row.reportVersionId ?? undefined,
  job_type: row.jobType,
  status: row.status,
  requested_format: row.requestedFormat,
  requested_by: row.requestedBy,
  queued_at: row.queuedAt.toISOString(),
  started_at: row.startedAt?.toISOString(),
  completed_at: row.completedAt?.toISOString(),
  error_code: row.errorCode ?? undefined,
  error_message_safe: row.errorMessageSafe ?? undefined,
  trace_id: row.traceId,
  metadata: row.metadata ?? {},
});

