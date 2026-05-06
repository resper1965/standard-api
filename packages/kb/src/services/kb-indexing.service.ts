import type { DocumentChunk } from "@standard/document-ingestion";
import type { DocumentResponse } from "@standard/schemas";
import type { KbIndexRequest, KbIndexResponse, KbRequestContext, KbServiceDependencies } from "../types";
import { KbReferenceService } from "./kb-reference.service";

export class KbIndexingService {
  private readonly references: KbReferenceService;

  constructor(private readonly deps: KbServiceDependencies) {
    this.references = new KbReferenceService(deps);
  }

  async indexAssessment(context: KbRequestContext, request: KbIndexRequest = { force_reindex: false }): Promise<KbIndexResponse> {
    const documents = request.document_id
      ? [await this.deps.documentIngestion.repositories.documents.getDocument(request.document_id, context.tenantId)].filter(Boolean)
      : await this.deps.documentIngestion.repositories.documents.listDocuments(context.assessmentId, context.tenantId);

    const queuedJobIds: string[] = [];
    const vectorReferenceIds: string[] = [];
    const skippedChunkIds: string[] = [];

    for (const document of documents as DocumentResponse[]) {
      if (document.assessment_id !== context.assessmentId || document.organization_id !== context.organizationId) continue;
      const chunks = await this.deps.documentIngestion.repositories.chunks.listChunks(document.document_id, context.tenantId, 1000);
      for (const chunk of chunks) {
        const result = await this.queueChunkEmbedding(chunk, request.force_reindex ?? false, context);
        if (result.queuedJobId) queuedJobIds.push(result.queuedJobId);
        if (result.vectorReferenceId) vectorReferenceIds.push(result.vectorReferenceId);
        if (result.skippedChunkId) skippedChunkIds.push(result.skippedChunkId);
      }
    }

    return {
      assessment_id: context.assessmentId,
      queued_job_ids: queuedJobIds,
      vector_reference_ids: vectorReferenceIds,
      skipped_chunk_ids: skippedChunkIds,
      trace_id: context.traceId
    };
  }

  async queueChunkEmbedding(chunk: DocumentChunk, forceReindex: boolean, context: KbRequestContext): Promise<{
    queuedJobId?: string;
    vectorReferenceId?: string;
    skippedChunkId?: string;
  }> {
    if (chunk.tenant_id !== context.tenantId || chunk.assessment_id !== context.assessmentId) {
      return { skippedChunkId: chunk.chunk_id };
    }

    const now = new Date().toISOString();
    const existingJob = await this.deps.repositories.embeddingJobs.findQueuedJobForChunk(chunk.chunk_id, context.tenantId);
    if (existingJob && !forceReindex) {
      return {
        skippedChunkId: chunk.chunk_id,
        ...(existingJob.vector_reference_id ? { vectorReferenceId: existingJob.vector_reference_id } : {})
      };
    }

    const reference = await this.references.getOrCreatePendingReference(chunk, now);
    if (reference.embedding_status === "embedded" && !forceReindex) {
      return { skippedChunkId: chunk.chunk_id, vectorReferenceId: reference.vector_reference_id };
    }

    const modelInfo = this.deps.embeddingProvider.getModelInfo();
    const queuedReference = {
      ...reference,
      embedding_status: "queued" as const,
      embedding_model: modelInfo.model,
      embedding_dimensions: modelInfo.dimensions || null,
      updated_at: now
    };
    await this.deps.repositories.vectorReferences.update(queuedReference);

    const job = {
      job_id: crypto.randomUUID(),
      tenant_id: chunk.tenant_id,
      organization_id: chunk.organization_id,
      assessment_id: chunk.assessment_id,
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      vector_reference_id: queuedReference.vector_reference_id,
      job_type: "embed_chunk" as const,
      status: "queued" as const,
      attempt_count: 0,
      queued_at: now,
      trace_id: context.traceId,
      embedding_model: modelInfo.model,
      vector_index_name: this.deps.vectorIndexName,
      metadata: { requested_by: context.requestedBy ?? context.actorId ?? "system" }
    };

    await this.deps.repositories.embeddingJobs.saveJob(job);
    await this.deps.queue.enqueue({
      tenant_id: chunk.tenant_id,
      organization_id: chunk.organization_id,
      assessment_id: chunk.assessment_id,
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      vector_reference_id: queuedReference.vector_reference_id,
      job_id: job.job_id,
      embedding_model: modelInfo.model,
      vector_index_name: this.deps.vectorIndexName,
      trace_id: context.traceId,
      ...(context.actorId ? { requested_by: context.actorId } : {}),
      created_at: now
    });

    return { queuedJobId: job.job_id, vectorReferenceId: queuedReference.vector_reference_id };
  }
}

