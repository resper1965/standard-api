import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "@standard/schemas";
import type { DocumentChunk, DocumentJobRepository, DocumentRecordRepository, DocumentChunkRepository, VectorReferenceRepository, AuditSink } from "./types";
import type { DocumentJobResponse, DocumentResponse, VectorReferenceResponse } from "@standard/schemas";

export class DrizzleDocumentRepository implements DocumentRecordRepository {
  constructor(private readonly db: NeonHttpDatabase<typeof schema>) {}

  async saveDocument(document: DocumentResponse): Promise<void> {
    await this.db.insert(schema.documents).values({
      id: document.document_id,
      tenantId: document.tenant_id,
      organizationId: document.organization_id,
      assessmentId: document.assessment_id,
      originalFilename: document.original_filename,
      storageProvider: document.storage_provider as any,
      storageKey: document.storage_key,
      contentHash: document.content_hash,
      mimeType: document.mime_type,
      fileSize: document.file_size,
      uploadedBy: document.uploaded_by,
      classification: document.classification as any,
      documentType: document.document_type as any,
      language: document.language
    }).onConflictDoUpdate({
      target: schema.documents.id,
      set: { contentHash: document.content_hash }
    });
  }

  async getDocument(documentId: string, tenantId: string): Promise<DocumentResponse | null> {
    const results = await this.db.select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, tenantId)))
      .limit(1);
    
    if (results.length === 0) return null;
    const r = results[0]!
    
    return {
      document_id: r.id,
      tenant_id: r.tenantId,
      organization_id: r.organizationId,
      assessment_id: r.assessmentId ?? "",
      original_filename: r.originalFilename,
      normalized_filename: r.originalFilename,
      storage_provider: r.storageProvider,
      storage_bucket: "standard-documents-prod",
      storage_key: r.storageKey,
      content_hash: r.contentHash,
      mime_type: r.mimeType,
      file_size: r.fileSize,
      uploaded_by: r.uploadedBy ?? "",
      uploaded_at: r.uploadedAt.toISOString(),
      classification: r.classification,
      document_type: r.documentType,
      language: r.language,
      status: "uploaded",
      scan_status: r.scanStatus ?? "pending",
      malware_signature: null,
      scanned_at: null,
      trace_id: "unknown"
    };
  }

  async listDocuments(assessmentId: string, tenantId: string): Promise<DocumentResponse[]> {
    const results = await this.db.select()
      .from(schema.documents)
      .where(and(eq(schema.documents.assessmentId, assessmentId), eq(schema.documents.tenantId, tenantId)))
      .orderBy(schema.documents.createdAt);
      
    return results.map(r => ({
      document_id: r.id,
      tenant_id: r.tenantId,
      organization_id: r.organizationId,
      assessment_id: r.assessmentId ?? "",
      original_filename: r.originalFilename,
      normalized_filename: r.originalFilename,
      storage_provider: r.storageProvider,
      storage_bucket: "standard-documents-prod",
      storage_key: r.storageKey,
      content_hash: r.contentHash,
      mime_type: r.mimeType,
      file_size: r.fileSize,
      uploaded_by: r.uploadedBy ?? "",
      uploaded_at: r.uploadedAt.toISOString(),
      classification: r.classification,
      document_type: r.documentType,
      language: r.language,
      status: "uploaded" as const,
      scan_status: r.scanStatus ?? ("pending" as const),
      malware_signature: null,
      scanned_at: null,
      trace_id: "unknown"
    }));
  }

  async updateDocument(document: DocumentResponse): Promise<void> {
    await this.db.update(schema.documents)
      .set({ 
        contentHash: document.content_hash,
      })
      .where(eq(schema.documents.id, document.document_id));
  }
}

export class DrizzleDocumentJobRepository implements DocumentJobRepository {
  constructor(private readonly db: NeonHttpDatabase<typeof schema>) {}

  async saveJob(job: DocumentJobResponse): Promise<void> {
    await this.db.insert(schema.documentExtractionJobs).values({
      id: job.job_id,
      tenantId: job.tenant_id,
      organizationId: job.organization_id,
      assessmentId: job.assessment_id,
      documentId: job.document_id,
      status: job.status as any,
      startedAt: job.started_at ? new Date(job.started_at) : null,
      completedAt: job.completed_at ? new Date(job.completed_at) : null,
      errorCode: job.error_code,
      errorMessage: job.error_message_safe,
      traceId: job.trace_id,
    }).onConflictDoUpdate({
      target: schema.documentExtractionJobs.id,
      set: {
        status: job.status as any,
        startedAt: job.started_at ? new Date(job.started_at) : null,
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        errorCode: job.error_code,
        errorMessage: job.error_message_safe
      }
    });
  }

  async getJob(jobId: string, tenantId: string): Promise<DocumentJobResponse | null> {
    const results = await this.db.select()
      .from(schema.documentExtractionJobs)
      .where(and(eq(schema.documentExtractionJobs.id, jobId), eq(schema.documentExtractionJobs.tenantId, tenantId)))
      .limit(1);

    if (results.length === 0) return null;
    const r = results[0]!;
    
    return {
      job_id: r.id,
      tenant_id: r.tenantId,
      organization_id: r.organizationId,
      assessment_id: r.assessmentId ?? "",
      document_id: r.documentId,
      job_type: "extract_and_chunk" as any,
      status: r.status as any,
      attempt_count: 0,
      queued_at: r.createdAt.toISOString(),
      started_at: r.startedAt?.toISOString(),
      completed_at: r.completedAt?.toISOString(),
      error_code: r.errorCode || undefined,
      error_message_safe: r.errorMessage || undefined,
      trace_id: r.traceId,
      metadata: {}
    };
  }

  async listJobsByDocument(documentId: string, tenantId: string): Promise<DocumentJobResponse[]> {
    const results = await this.db.select()
      .from(schema.documentExtractionJobs)
      .where(and(eq(schema.documentExtractionJobs.documentId, documentId), eq(schema.documentExtractionJobs.tenantId, tenantId)))
      .orderBy(schema.documentExtractionJobs.createdAt);
      
    return results.map(r => ({
      job_id: r.id,
      tenant_id: r.tenantId,
      organization_id: r.organizationId,
      assessment_id: r.assessmentId ?? "",
      document_id: r.documentId,
      job_type: "extract_and_chunk" as any,
      status: r.status as any,
      attempt_count: 0,
      queued_at: r.createdAt.toISOString(),
      started_at: r.startedAt?.toISOString(),
      completed_at: r.completedAt?.toISOString(),
      error_code: r.errorCode || undefined,
      error_message_safe: r.errorMessage || undefined,
      trace_id: r.traceId,
      metadata: {}
    }));
  }

  async listJobsByAssessment(assessmentId: string, tenantId: string): Promise<DocumentJobResponse[]> {
    const results = await this.db.select()
      .from(schema.documentExtractionJobs)
      .where(and(eq(schema.documentExtractionJobs.assessmentId, assessmentId), eq(schema.documentExtractionJobs.tenantId, tenantId)))
      .orderBy(schema.documentExtractionJobs.createdAt);
      
    return results.map(r => ({
      job_id: r.id,
      tenant_id: r.tenantId,
      organization_id: r.organizationId,
      assessment_id: r.assessmentId ?? "",
      document_id: r.documentId,
      job_type: "extract_and_chunk" as any,
      status: r.status as any,
      attempt_count: 0,
      queued_at: r.createdAt.toISOString(),
      started_at: r.startedAt?.toISOString(),
      completed_at: r.completedAt?.toISOString(),
      error_code: r.errorCode || undefined,
      error_message_safe: r.errorMessage || undefined,
      trace_id: r.traceId,
      metadata: {}
    }));
  }

  async updateJob(job: DocumentJobResponse): Promise<void> {
    await this.saveJob(job);
  }
}

export class DrizzleDocumentChunkRepository implements DocumentChunkRepository {
  constructor(private readonly db: NeonHttpDatabase<typeof schema>) {}

  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    await this.db.insert(schema.documentChunks).values(chunks.map(c => ({
      id: c.chunk_id,
      tenantId: c.tenant_id,
      organizationId: c.organization_id,
      assessmentId: c.assessment_id,
      documentId: c.document_id,
      chunkIndex: c.chunk_index,
      textHash: c.text_hash,
      pageNumber: c.page_number,
      approximateTokenCount: c.token_count_estimate,
      locationMetadata: c.location_metadata
    }))).onConflictDoNothing();
  }

  async listChunks(documentId: string, tenantId: string, limit: number, cursor?: string): Promise<DocumentChunk[]> {
    return []; // For now not deeply needed by workers if only inserting
  }
}

export class DrizzleVectorReferenceRepository implements VectorReferenceRepository {
  constructor(private readonly db: NeonHttpDatabase<typeof schema>) {}

  async saveVectorReferences(references: VectorReferenceResponse[]): Promise<void> {
    if (references.length === 0) return;
    
    await this.db.insert(schema.vectorReferences).values(references.map(r => ({
      id: r.vector_reference_id,
      tenantId: r.tenant_id,
      organizationId: r.organization_id,
      assessmentId: r.assessment_id,
      kbEntryId: r.chunk_id, // using chunk_id as kb entry for now
      vectorProvider: r.vector_provider,
      vectorIndexName: r.vector_index_name,
      vectorId: r.vector_id || "null"
    }))).onConflictDoNothing();
  }
}

