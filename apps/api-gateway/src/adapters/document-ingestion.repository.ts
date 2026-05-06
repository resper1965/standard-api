/**
 * @module document-ingestion.repository
 * @description Drizzle PostgreSQL repositories for Document Ingestion pipeline.
 * Implements: DocumentRecordRepository, DocumentJobRepository, DocumentChunkRepository,
 * VectorReferenceRepository, AuditSink.
 */
import { eq, and } from "drizzle-orm";
import {
  documents,
  documentChunks,
  documentExtractionJobs,
  vectorReferences,
  auditLogs,
} from "@standard/schemas";
import type {
  DocumentResponse,
  DocumentJobResponse,
  VectorReferenceResponse
} from "@standard/schemas";
import type {
  DocumentRecordRepository,
  DocumentJobRepository,
  DocumentChunkRepository,
  VectorReferenceRepository,
  AuditSink,
  DocumentChunk,
  IngestionRepositories
} from "@standard/document-ingestion";
import type { DbClient } from "./db";

// ---------- Documents ----------

export const createDrizzleDocumentRepository = (db: DbClient): DocumentRecordRepository => ({
  async saveDocument(doc: DocumentResponse) {
    await db.insert(documents).values({
      id: doc.document_id,
      tenantId: doc.tenant_id,
      organizationId: doc.organization_id,
      assessmentId: doc.assessment_id,
      originalFilename: doc.original_filename,
      storageProvider: doc.storage_provider as "r2" | "external" | "r2_compatible_mock",
      storageKey: doc.storage_key,
      contentHash: doc.content_hash,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      uploadedBy: doc.uploaded_by,
      classification: doc.classification as "public" | "internal" | "confidential" | "restricted",
      documentType: doc.document_type as "policy" | "procedure" | "standard" | "evidence" | "soa" | "report" | "other",
      language: doc.language,
      versionLabel: doc.version_label,
      effectiveDate: doc.effective_date,
    }).onConflictDoNothing();
  },

  async getDocument(documentId: string, tenantId: string) {
    const [row] = await db.select().from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);
    return row ? mapDocumentRow(row) : null;
  },

  async listDocuments(assessmentId: string, tenantId: string) {
    const rows = await db.select().from(documents)
      .where(and(eq(documents.assessmentId, assessmentId), eq(documents.tenantId, tenantId)));
    return rows.map(mapDocumentRow);
  },

  async updateDocument(doc: DocumentResponse) {
    await db.update(documents).set({
      originalFilename: doc.original_filename,
      contentHash: doc.content_hash,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      updatedAt: new Date(),
    }).where(eq(documents.id, doc.document_id));
  },
});

type DocumentRow = typeof documents.$inferSelect;
const mapDocumentRow = (row: DocumentRow): DocumentResponse => ({
  document_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  original_filename: row.originalFilename,
  normalized_filename: row.originalFilename.toLowerCase().replace(/[^a-z0-9._-]/g, "_"),
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
  trace_id: "",
});

// ---------- Extraction Jobs ----------

export const createDrizzleDocumentJobRepository = (db: DbClient): DocumentJobRepository => ({
  async saveJob(job: DocumentJobResponse) {
    await db.insert(documentExtractionJobs).values({
      id: job.job_id,
      tenantId: job.tenant_id,
      organizationId: job.organization_id,
      assessmentId: job.assessment_id,
      documentId: job.document_id,
      status: job.status === "running" ? "processing" :
              job.status === "succeeded" ? "completed" :
              job.status as "queued" | "processing" | "completed" | "failed" | "cancelled",
      errorCode: job.error_code,
      errorMessage: job.error_message_safe,
      startedAt: job.started_at ? new Date(job.started_at) : null,
      completedAt: job.completed_at ? new Date(job.completed_at) : null,
      traceId: job.trace_id,
    }).onConflictDoNothing();
  },

  async getJob(jobId: string, tenantId: string) {
    const [row] = await db.select().from(documentExtractionJobs)
      .where(and(eq(documentExtractionJobs.id, jobId), eq(documentExtractionJobs.tenantId, tenantId)))
      .limit(1);
    return row ? mapJobRow(row) : null;
  },

  async listJobsByDocument(documentId: string, tenantId: string) {
    const rows = await db.select().from(documentExtractionJobs)
      .where(and(eq(documentExtractionJobs.documentId, documentId), eq(documentExtractionJobs.tenantId, tenantId)));
    return rows.map(mapJobRow);
  },

  async listJobsByAssessment(assessmentId: string, tenantId: string) {
    const rows = await db.select().from(documentExtractionJobs)
      .where(and(eq(documentExtractionJobs.assessmentId, assessmentId), eq(documentExtractionJobs.tenantId, tenantId)));
    return rows.map(mapJobRow);
  },

  async updateJob(job: DocumentJobResponse) {
    await db.update(documentExtractionJobs).set({
      status: job.status === "running" ? "processing" :
              job.status === "succeeded" ? "completed" :
              job.status as "queued" | "processing" | "completed" | "failed" | "cancelled",
      errorCode: job.error_code,
      errorMessage: job.error_message_safe,
      startedAt: job.started_at ? new Date(job.started_at) : null,
      completedAt: job.completed_at ? new Date(job.completed_at) : null,
      updatedAt: new Date(),
    }).where(eq(documentExtractionJobs.id, job.job_id));
  },
});

type JobRow = typeof documentExtractionJobs.$inferSelect;
const mapJobRow = (row: JobRow): DocumentJobResponse => ({
  job_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  document_id: row.documentId,
  job_type: "extract_and_chunk",
  status: row.status === "processing" ? "running" :
          row.status === "completed" ? "succeeded" :
          row.status as "queued" | "running" | "succeeded" | "failed" | "cancelled",
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

export const createDrizzleDocumentChunkRepository = (db: DbClient): DocumentChunkRepository => ({
  async saveChunks(chunks: DocumentChunk[]) {
    if (chunks.length === 0) return;
    await db.insert(documentChunks).values(
      chunks.map((chunk) => ({
        id: chunk.chunk_id,
        tenantId: chunk.tenant_id,
        organizationId: chunk.organization_id,
        assessmentId: chunk.assessment_id,
        documentId: chunk.document_id,
        documentVersionId: chunk.document_version_id,
        chunkIndex: chunk.chunk_index,
        textHash: chunk.text_hash,
        pageNumber: chunk.page_number,
        approximateTokenCount: chunk.token_count_estimate,
        locationMetadata: chunk.location_metadata,
      }))
    ).onConflictDoNothing();
  },

  async listChunks(documentId: string, tenantId: string, limit: number) {
    const rows = await db.select().from(documentChunks)
      .where(and(eq(documentChunks.documentId, documentId), eq(documentChunks.tenantId, tenantId)))
      .limit(limit);
    return rows.map(mapChunkRow);
  },
});

type ChunkRow = typeof documentChunks.$inferSelect;
const mapChunkRow = (row: ChunkRow): DocumentChunk => ({
  chunk_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId ?? "",
  document_id: row.documentId,
  ...(row.documentVersionId ? { document_version_id: row.documentVersionId } : {}),
  chunk_index: row.chunkIndex,
  chunk_text: "", // DB does not store raw text (stored in R2 / reconstructed from index)
  text_hash: row.textHash,
  token_count_estimate: row.approximateTokenCount ?? 0,
  ...(row.pageNumber != null ? { page_number: row.pageNumber } : {}),
  location_metadata: row.locationMetadata ?? {},
  created_at: row.createdAt.toISOString(),
});

// ---------- Vector References ----------

export const createDrizzleIngestionVectorRefRepository = (db: DbClient): VectorReferenceRepository => ({
  async saveVectorReferences(refs: VectorReferenceResponse[]) {
    if (refs.length === 0) return;
    await db.insert(vectorReferences).values(
      refs.map((ref) => ({
        id: ref.vector_reference_id,
        tenantId: ref.tenant_id,
        organizationId: ref.organization_id,
        assessmentId: ref.assessment_id,
        kbEntryId: ref.chunk_id, // Maps chunk → kbEntry relationship
        vectorProvider: ref.vector_provider,
        vectorIndexName: ref.vector_index_name,
        vectorId: ref.vector_id ?? `pending_${ref.chunk_id}`,
      }))
    ).onConflictDoNothing();
  },
});

// ---------- Audit Sink ----------

export const createDrizzleIngestionAuditSink = (db: DbClient): AuditSink => ({
  async record(event: string, metadata: Record<string, unknown>) {
    await db.insert(auditLogs).values({
      tenantId: (metadata.tenant_id as string) ?? "system",
      organizationId: (metadata.organization_id as string) ?? undefined,
      actorId: (metadata.actor_id as string) ?? undefined,
      action: event,
      resourceType: "document",
      resourceId: (metadata.document_id as string) ?? undefined,
      traceId: (metadata.trace_id as string) ?? crypto.randomUUID(),
      metadata: metadata,
    });
  },
});

// ---------- Factory ----------

export const createDrizzleIngestionRepositories = (db: DbClient): IngestionRepositories => ({
  documents: createDrizzleDocumentRepository(db),
  jobs: createDrizzleDocumentJobRepository(db),
  chunks: createDrizzleDocumentChunkRepository(db),
  vectorReferences: createDrizzleIngestionVectorRefRepository(db),
  audit: createDrizzleIngestionAuditSink(db),
});

