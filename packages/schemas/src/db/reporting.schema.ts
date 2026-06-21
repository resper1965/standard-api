import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import {
  artifactStatusEnum,
  exportJobStatusEnum,
  reportArtifactTypeEnum,
  reportFormatEnum,
  reportTypeEnum,
  storageProviderEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import {
  approvalEvents,
  assessments,
  assessmentScope,
  gapAnalysisVersions,
  maturityAssessmentVersions,
  poamVersions,
  soaVersions,
} from "./assessment.schema";
import { scfFrameworks, scfVersions } from "./scf.schema";
import { agentRuns } from "./agent.schema";

export const reportVersions = pgTable(
  "report_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    reportType: reportTypeEnum("report_type").notNull(),
    title: text("title").notNull().default("Standard Assessment Report"),
    status: artifactStatusEnum("status").default("draft").notNull(),
    sourceScopeId: uuid("source_scope_id").references(() => assessmentScope.id),
    sourceSoaVersionId: uuid("source_soa_version_id").references(
      () => soaVersions.id,
    ),
    sourceGapAnalysisVersionId: uuid(
      "source_gap_analysis_version_id",
    ).references(() => gapAnalysisVersions.id),
    sourceMaturityAssessmentVersionId: uuid(
      "source_maturity_assessment_version_id",
    ).references(() => maturityAssessmentVersions.id),
    sourcePoamVersionId: uuid("source_poam_version_id").references(
      () => poamVersions.id,
    ),
    frameworkId: uuid("framework_id").references(() => scfFrameworks.id),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    generatedByAgentRunId: uuid("generated_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    createdBy: uuid("created_by"),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    traceId: text("trace_id").notNull().default("trace-not-set"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("report_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("report_versions_sources_idx").on(
      table.sourceSoaVersionId,
      table.sourceGapAnalysisVersionId,
      table.sourcePoamVersionId,
    ),
    uniqueIndex("report_versions_assessment_type_version_uidx").on(
      table.assessmentId,
      table.reportType,
      table.versionNumber,
    ),
  ],
);

export const reportArtifacts = pgTable(
  "report_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    reportVersionId: uuid("report_version_id")
      .notNull()
      .references(() => reportVersions.id),
    artifactType: reportArtifactTypeEnum("artifact_type")
      .notNull()
      .default("report"),
    format: reportFormatEnum("format").notNull().default("json"),
    storageProvider: storageProviderEnum("storage_provider")
      .default("r2")
      .notNull(),
    storageBucket: text("storage_bucket"),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_artifacts_version_idx").on(table.reportVersionId),
    uniqueIndex("report_artifacts_storage_key_uidx").on(
      table.storageProvider,
      table.storageKey,
    ),
  ],
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    reportVersionId: uuid("report_version_id").references(
      () => reportVersions.id,
    ),
    jobType: text("job_type").notNull(),
    status: exportJobStatusEnum("status").default("queued").notNull(),
    requestedFormat: reportFormatEnum("requested_format").notNull(),
    requestedBy: uuid("requested_by").notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessageSafe: text("error_message_safe"),
    traceId: text("trace_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
  },
  (table) => [
    index("export_jobs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("export_jobs_report_idx").on(table.reportVersionId),
    index("export_jobs_status_idx").on(table.status),
  ],
);
