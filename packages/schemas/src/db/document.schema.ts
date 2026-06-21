import {
  bigint,
  date,
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
  documentClassificationEnum,
  documentTypeEnum,
  extractionJobStatusEnum,
  malwareScanStatusEnum,
  storageProviderEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    originalFilename: text("original_filename").notNull(),
    storageProvider: storageProviderEnum("storage_provider")
      .default("r2")
      .notNull(),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    uploadedBy: uuid("uploaded_by"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    classification: documentClassificationEnum("classification")
      .default("internal")
      .notNull(),
    documentType: documentTypeEnum("document_type").default("other").notNull(),
    effectiveDate: date("effective_date"),
    versionLabel: text("version_label"),
    language: text("language").default("und").notNull(),
    scanStatus: malwareScanStatusEnum("scan_status")
      .default("pending")
      .notNull(),
    malwareSignature: text("malware_signature"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("documents_tenant_org_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("documents_scan_status_idx").on(table.scanStatus),
    uniqueIndex("documents_storage_key_uidx").on(
      table.storageProvider,
      table.storageKey,
    ),
    uniqueIndex("documents_assessment_hash_uidx").on(
      table.organizationId,
      table.assessmentId,
      table.contentHash,
    ),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    versionNumber: integer("version_number").notNull(),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    scanStatus: malwareScanStatusEnum("scan_status")
      .default("pending")
      .notNull(),
    malwareSignature: text("malware_signature"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("document_versions_document_idx").on(table.documentId),
    index("document_versions_scan_status_idx").on(table.scanStatus),
    uniqueIndex("document_versions_document_number_uidx").on(
      table.documentId,
      table.versionNumber,
    ),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    documentVersionId: uuid("document_version_id").references(
      () => documentVersions.id,
    ),
    chunkIndex: integer("chunk_index").notNull(),
    textHash: text("text_hash").notNull(),
    pageNumber: integer("page_number"),
    locationMetadata: jsonb("location_metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    approximateTokenCount: integer("approximate_token_count"),
    ...timestamps(),
  },
  (table) => [
    index("document_chunks_document_idx").on(table.documentId),
    uniqueIndex("document_chunks_document_index_uidx").on(
      table.documentId,
      table.chunkIndex,
    ),
  ],
);

export const documentExtractionJobs = pgTable(
  "document_extraction_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    status: extractionJobStatusEnum("status").default("queued").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("document_extraction_jobs_status_idx").on(table.status),
    index("document_extraction_jobs_document_idx").on(table.documentId),
  ],
);
