import type { ChunkingConfig, DocumentIngestionJobMessage, DocumentResponse } from "@standard/schemas";
import { buildStorageKey } from "./filename";
import { validateFile } from "./validation";
import type { DocumentIngestionServiceDependencies, FileDescriptor, UploadContext } from "./types";

const defaultChunking: ChunkingConfig = {
  max_tokens_estimate: 800,
  overlap_tokens_estimate: 80,
  strategy: "by_tokens_estimate",
  preserve_headings: true,
  preserve_pages: true
};

export class DocumentIngestionService {
  constructor(private readonly deps: DocumentIngestionServiceDependencies) {}

  async uploadDocument(input: {
    documentId: string;
    jobId: string;
    file: FileDescriptor;
    context: UploadContext;
    metadata?: {
      classification?: string;
      documentType?: string;
      language?: string;
      versionLabel?: string;
      effectiveDate?: string;
    };
  }): Promise<{ document: DocumentResponse; message: DocumentIngestionJobMessage }> {
    const validation = await validateFile(input.file);
    const storageKey = buildStorageKey({
      tenantId: input.context.tenantId,
      organizationId: input.context.organizationId,
      assessmentId: input.context.assessmentId,
      documentId: input.documentId,
      safeFilename: validation.normalizedFilename
    });

    await this.deps.storage.putObject({
      key: storageKey,
      bytes: input.file.bytes,
      contentType: validation.mimeType,
      contentHash: validation.contentHash,
      metadata: {
        tenant_id: input.context.tenantId,
        organization_id: input.context.organizationId,
        assessment_id: input.context.assessmentId,
        document_id: input.documentId,
        trace_id: input.context.traceId
      }
    });

    const document: DocumentResponse = {
      document_id: input.documentId,
      tenant_id: input.context.tenantId,
      organization_id: input.context.organizationId,
      assessment_id: input.context.assessmentId,
      original_filename: input.file.originalFilename,
      normalized_filename: validation.normalizedFilename,
      storage_provider: this.deps.storageProvider,
      storage_bucket: this.deps.bucketName,
      storage_key: storageKey,
      content_hash: validation.contentHash,
      mime_type: validation.mimeType,
      file_size: validation.fileSize,
      uploaded_by: input.context.actorId,
      uploaded_at: input.context.now,
      classification: input.metadata?.classification ?? "internal",
      document_type: input.metadata?.documentType ?? "assessment_document",
      language: input.metadata?.language ?? "und",
      ...(input.metadata?.versionLabel ? { version_label: input.metadata.versionLabel } : {}),
      ...(input.metadata?.effectiveDate ? { effective_date: input.metadata.effectiveDate } : {}),
      status: "queued_for_extraction",
      trace_id: input.context.traceId
    };

    const message: DocumentIngestionJobMessage = {
      tenant_id: input.context.tenantId,
      organization_id: input.context.organizationId,
      assessment_id: input.context.assessmentId,
      document_id: input.documentId,
      job_id: input.jobId,
      storage_key: storageKey,
      mime_type: validation.mimeType,
      trace_id: input.context.traceId,
      requested_by: input.context.actorId,
      created_at: input.context.now
    };

    await this.deps.repositories.documents.saveDocument(document);
    await this.deps.repositories.jobs.saveJob({
      job_id: input.jobId,
      tenant_id: input.context.tenantId,
      organization_id: input.context.organizationId,
      assessment_id: input.context.assessmentId,
      document_id: input.documentId,
      job_type: "extract_and_chunk",
      status: "queued",
      attempt_count: 0,
      queued_at: input.context.now,
      trace_id: input.context.traceId,
      metadata: { validation_warnings: validation.warnings }
    });
    await this.deps.queue.enqueue(message);
    await this.deps.repositories.audit.record("document_uploaded", {
      tenant_id: input.context.tenantId,
      organization_id: input.context.organizationId,
      assessment_id: input.context.assessmentId,
      document_id: input.documentId,
      actor_id: input.context.actorId,
      trace_id: input.context.traceId,
      timestamp: input.context.now
    });
    await this.deps.repositories.audit.record("document_extraction_queued", {
      tenant_id: input.context.tenantId,
      organization_id: input.context.organizationId,
      assessment_id: input.context.assessmentId,
      document_id: input.documentId,
      job_id: input.jobId,
      trace_id: input.context.traceId,
      timestamp: input.context.now
    });

    return { document, message };
  }

  get chunkingConfig(): ChunkingConfig {
    return this.deps.chunking ?? defaultChunking;
  }
}

