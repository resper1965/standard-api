/**
 * @module document-ingestion.repository
 * @description Drizzle PostgreSQL repositories for Document Ingestion pipeline.
 * Implements: DocumentRecordRepository, DocumentJobRepository, DocumentChunkRepository,
 * VectorReferenceRepository, AuditSink.
 */
import { eq, sql } from "drizzle-orm";
import {
  documents,
  documentChunks,
  documentExtractionJobs,
  vectorReferences,
  auditLogs,
  AUDIT_METADATA_ALLOWLIST,
} from "@standard/schemas";
import type {
  DocumentResponse,
  DocumentJobResponse,
  VectorReferenceResponse,
} from "@standard/schemas";
import type {
  DocumentRecordRepository,
  DocumentJobRepository,
  DocumentChunkRepository,
  VectorReferenceRepository,
  AuditSink,
  DocumentChunk,
  IngestionRepositories,
} from "@standard/document-ingestion";
import type { DbClient } from "./db";

// ---------- Documents ----------

const createDrizzleDocumentRepository = (
  db: DbClient,
): DocumentRecordRepository => {
  const repo = {
    async saveDocument(doc: DocumentResponse) {
      await db
        .insert(documents)

        .values({
          id: String(doc.document_id),
          organizationId: String(doc.organization_id),
          assessmentId: String(doc.assessment_id),
          originalFilename: String(doc.original_filename),
          storageProvider: String(doc.storage_provider) as
            | "r2"
            | "external"
            | "r2_compatible_mock",
          storageKey: String(doc.storage_key),
          contentHash: String(doc.content_hash),
          mimeType: String(doc.mime_type),
          fileSize: Number(doc.file_size),
          uploadedBy:
            doc.uploaded_by != null ? String(doc.uploaded_by) : undefined,
          classification: String(doc.classification) as
            | "public"
            | "internal"
            | "confidential"
            | "restricted",
          documentType: String(doc.document_type) as
            | "policy"
            | "procedure"
            | "standard"
            | "evidence"
            | "soa"
            | "report"
            | "other",
          language: doc.language != null ? String(doc.language) : undefined,
          versionLabel:
            doc.version_label != null ? String(doc.version_label) : undefined,
          effectiveDate:
            doc.effective_date != null ? String(doc.effective_date) : undefined,
        } as any)
        .onConflictDoNothing();
    },

    async getDocument(documentId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      return row ? mapDocumentRow(row) : null;
    },

    async listDocuments(assessmentId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.assessmentId, assessmentId));
      return rows.map(mapDocumentRow);
    },

    async updateDocument(doc: DocumentResponse) {
      await db
        .update(documents)
        .set({
          originalFilename: String(doc.original_filename),
          contentHash: String(doc.content_hash),
          mimeType: String(doc.mime_type),
          fileSize: Number(doc.file_size),
          updatedAt: new Date(),
        } as any)
        .where(eq(documents.id, String(doc.document_id)));
    },

    withOrganization(organizationId: string) {
      return {
        saveDocument: (doc: DocumentResponse) => repo.saveDocument(doc),
        getDocument: (documentId: string) =>
          repo.getDocument(documentId, organizationId),
        listDocuments: (assessmentId: string) =>
          repo.listDocuments(assessmentId, organizationId),
        updateDocument: (doc: DocumentResponse) => repo.updateDocument(doc),
      };
    },
  };
  return repo;
};

type DocumentRow = typeof documents.$inferSelect;
const mapDocumentRow = (row: DocumentRow): DocumentResponse => ({
  document_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  original_filename: row.originalFilename,
  normalized_filename: row.originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_"),
  storage_provider: row.storageProvider,
  storage_bucket: "STANDARD_DOCUMENTS_BUCKET",
  storage_key: row.storageKey,
  content_hash: row.contentHash,
  mime_type: row.mimeType,
  file_size: row.fileSize,
  uploaded_by: row.uploadedBy ?? "",
  uploaded_at: row.uploadedAt.toISOString(),
  classification: row.classification,
  document_type: row.documentType,
  language: row.language,
  version_label: row.versionLabel ?? undefined,
  effective_date: row.effectiveDate ?? undefined,
  status: "uploaded",
  scan_status: row.scanStatus ?? "pending",
  malware_signature: null,
  scanned_at: null,
  trace_id: "",
});

// ---------- Extraction Jobs ----------

const createDrizzleDocumentJobRepository = (
  db: DbClient,
): DocumentJobRepository => {
  const repo = {
    async saveJob(job: DocumentJobResponse) {
      await db
        .insert(documentExtractionJobs)

        .values({
          id: String(job.job_id),
          organizationId: String(job.organization_id),
          assessmentId: String(job.assessment_id),
          documentId: String(job.document_id),
          status: (job.status === "running"
            ? "processing"
            : job.status === "succeeded"
              ? "completed"
              : job.status) as
            | "queued"
            | "processing"
            | "completed"
            | "failed"
            | "cancelled",
          errorCode:
            job.error_code != null ? String(job.error_code) : undefined,
          errorMessage:
            job.error_message_safe != null
              ? String(job.error_message_safe)
              : undefined,
          startedAt: job.started_at ? new Date(job.started_at) : undefined,
          completedAt: job.completed_at
            ? new Date(job.completed_at)
            : undefined,
          traceId: String(job.trace_id),
        } as any)
        .onConflictDoNothing();
    },

    async getJob(jobId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(documentExtractionJobs)
        .where(eq(documentExtractionJobs.id, jobId))
        .limit(1);
      return row ? mapJobRow(row) : null;
    },

    async listJobsByDocument(documentId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(documentExtractionJobs)
        .where(eq(documentExtractionJobs.documentId, documentId));
      return rows.map(mapJobRow);
    },

    async listJobsByAssessment(assessmentId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(documentExtractionJobs)
        .where(eq(documentExtractionJobs.assessmentId, assessmentId));
      return rows.map(mapJobRow);
    },

    async updateJob(job: DocumentJobResponse) {
      await db
        .update(documentExtractionJobs)
        .set({
          status: (job.status === "running"
            ? "processing"
            : job.status === "succeeded"
              ? "completed"
              : job.status) as
            | "queued"
            | "processing"
            | "completed"
            | "failed"
            | "cancelled",
          errorCode: job.error_code != null ? String(job.error_code) : null,
          errorMessage:
            job.error_message_safe != null
              ? String(job.error_message_safe)
              : null,
          startedAt: job.started_at ? new Date(job.started_at) : null,
          completedAt: job.completed_at ? new Date(job.completed_at) : null,
          updatedAt: new Date(),
        } as any)
        .where(eq(documentExtractionJobs.id, String(job.job_id)));
    },

    withOrganization(organizationId: string) {
      return {
        saveJob: (job: DocumentJobResponse) => repo.saveJob(job),
        getJob: (jobId: string) => repo.getJob(jobId, organizationId),
        listJobsByDocument: (documentId: string) =>
          repo.listJobsByDocument(documentId, organizationId),
        listJobsByAssessment: (assessmentId: string) =>
          repo.listJobsByAssessment(assessmentId, organizationId),
        updateJob: (job: DocumentJobResponse) => repo.updateJob(job),
      };
    },
  };
  return repo;
};

type JobRow = typeof documentExtractionJobs.$inferSelect;
const mapJobRow = (row: JobRow): DocumentJobResponse => ({
  job_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  document_id: row.documentId,
  job_type: "extract_and_chunk",
  status:
    row.status === "processing"
      ? "running"
      : row.status === "completed"
        ? "succeeded"
        : (row.status as
            | "queued"
            | "running"
            | "succeeded"
            | "failed"
            | "cancelled"),
  attempt_count: 0,
  error_code: row.errorCode ?? undefined,
  error_message_safe: row.errorMessage ?? undefined,
  queued_at: row.createdAt.toISOString(),
  started_at: row.startedAt?.toISOString(),
  completed_at: row.completedAt?.toISOString(),
  trace_id: row.traceId,
  metadata: {},
});

// ---------- Document Chunks ----------

const createDrizzleDocumentChunkRepository = (
  db: DbClient,
): DocumentChunkRepository => {
  const repo = {
    async saveChunks(chunks: DocumentChunk[]) {
      if (chunks.length === 0) return;
      await db
        .insert(documentChunks)
        .values(
          chunks.map(
            (chunk) =>
              ({
                id: String(chunk.chunk_id),
                organizationId: String(chunk.organization_id),
                assessmentId: String(chunk.assessment_id),
                documentId: String(chunk.document_id),
                documentVersionId:
                  chunk.document_version_id != null
                    ? String(chunk.document_version_id)
                    : undefined,
                chunkIndex: Number(chunk.chunk_index),
                textHash: String(chunk.text_hash),
                pageNumber:
                  chunk.page_number != null
                    ? Number(chunk.page_number)
                    : undefined,
                approximateTokenCount:
                  chunk.token_count_estimate != null
                    ? Number(chunk.token_count_estimate)
                    : undefined,
                locationMetadata: (chunk.location_metadata ?? {}) as Record<
                  string,
                  unknown
                >,
              }) as any,
          ),
        )
        .onConflictDoNothing();
    },

    async listChunks(
      documentId: string,
      _organizationId: string,
      limit: number,
      _cursor?: string,
    ) {
      const rows = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId))
        .limit(limit);
      return rows.map(mapChunkRow);
    },

    withOrganization(organizationId: string) {
      return {
        saveChunks: (chunks: DocumentChunk[]) => repo.saveChunks(chunks),
        listChunks: (documentId: string, limit: number, cursor?: string) =>
          repo.listChunks(documentId, organizationId, limit, cursor),
      };
    },
  };
  return repo;
};

type ChunkRow = typeof documentChunks.$inferSelect;
const mapChunkRow = (row: ChunkRow): DocumentChunk => ({
  chunk_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  document_id: row.documentId,
  ...(row.documentVersionId
    ? { document_version_id: row.documentVersionId }
    : {}),
  chunk_index: row.chunkIndex,
  chunk_text: "", // DB does not store raw text (stored in R2 / reconstructed from index)
  text_hash: row.textHash,
  token_count_estimate: row.approximateTokenCount ?? 0,
  ...(row.pageNumber != null ? { page_number: row.pageNumber } : {}),
  location_metadata: (row.locationMetadata ?? {}) as Record<string, unknown>,
  created_at: row.createdAt.toISOString(),
});

// ---------- Vector References ----------

const createDrizzleIngestionVectorRefRepository = (
  db: DbClient,
): VectorReferenceRepository => ({
  async saveVectorReferences(refs: VectorReferenceResponse[]) {
    if (refs.length === 0) return;
    await db
      .insert(vectorReferences)
      .values(
        refs.map(
          (ref) =>
            ({
              id: String(ref.vector_reference_id),
              organizationId: String(ref.organization_id),
              assessmentId: String(ref.assessment_id),
              kbEntryId: String(ref.chunk_id), // Maps chunk â†’ kbEntry relationship
              vectorProvider: String(ref.vector_provider),
              vectorIndexName: String(ref.vector_index_name),
              vectorId:
                ref.vector_id != null
                  ? String(ref.vector_id)
                  : `pending_${String(ref.chunk_id)}`,
            }) as any,
        ),
      )
      .onConflictDoNothing();
  },
});

// ---------- Audit Sink ----------

const createDrizzleIngestionAuditSink = (db: DbClient): AuditSink => {
  const isUuid = (val: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      val,
    );
  };

  return {
    async record(event: string, metadata: Record<string, unknown>) {
      const organizationId =
        typeof metadata.organization_id === "string" &&
        isUuid(metadata.organization_id)
          ? metadata.organization_id
          : null;
      const actorId =
        typeof metadata.actor_id === "string" && isUuid(metadata.actor_id)
          ? metadata.actor_id
          : null;
      const resourceId =
        typeof metadata.document_id === "string" && isUuid(metadata.document_id)
          ? metadata.document_id
          : null;

      // Sanitize metadata: only copy allowlisted keys, then delete columns
      const safeMeta: Record<string, unknown> = {};
      for (const key of Object.keys(metadata)) {
        if (AUDIT_METADATA_ALLOWLIST.includes(key as never)) {
          safeMeta[key] = metadata[key];
        }
      }
      if (organizationId) delete safeMeta.organization_id;
      if (actorId) delete safeMeta.actor_id;
      if (resourceId) delete safeMeta.document_id;
      delete safeMeta.trace_id;

      await db.insert(auditLogs).values({
        organizationId,
        actorId,
        action: event,
        resourceType: "document",
        resourceId,
        traceId: (metadata.trace_id as string) ?? crypto.randomUUID(),
        metadata: safeMeta,
      });
    },
  };
};

// ---------- Factory ----------

export const createDrizzleIngestionRepositories = (
  db: DbClient,
): IngestionRepositories => ({
  documents: createDrizzleDocumentRepository(db),
  jobs: createDrizzleDocumentJobRepository(db),
  chunks: createDrizzleDocumentChunkRepository(db),
  vectorReferences: createDrizzleIngestionVectorRefRepository(db),
  audit: createDrizzleIngestionAuditSink(db),
});

