import type { DocumentIngestionJobMessage, VectorReferenceResponse } from "@aegis/schemas";
import { chunkExtractedDocument } from "./chunker";
import { getExtension } from "./filename";
import type { DocumentIngestionServiceDependencies } from "./types";

const safeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "Unknown ingestion error";
  return message.slice(0, 240);
};

export const processDocumentIngestionJob = async (
  message: DocumentIngestionJobMessage,
  deps: DocumentIngestionServiceDependencies,
  idFactory: () => string = () => crypto.randomUUID(),
  nowFactory: () => string = () => new Date().toISOString()
): Promise<void> => {
  const now = nowFactory();
  const job = await deps.repositories.jobs.getJob(message.job_id, message.tenant_id);
  const document = await deps.repositories.documents.getDocument(message.document_id, message.tenant_id);
  if (!job || !document) {
    throw new Error("Ingestion job or document not found.");
  }

  await deps.repositories.jobs.updateJob({ ...job, status: "running", started_at: now, attempt_count: job.attempt_count + 1 });
  await deps.repositories.documents.updateDocument({ ...document, status: "extracting" });
  await deps.repositories.audit.record("document_extraction_started", {
    tenant_id: message.tenant_id,
    organization_id: message.organization_id,
    assessment_id: message.assessment_id,
    document_id: message.document_id,
    job_id: message.job_id,
    trace_id: message.trace_id,
    timestamp: now
  });

  try {
    const object = await deps.storage.getObject(message.storage_key);
    if (!object) throw new Error("Stored document object not found.");

    const extension = getExtension(document.normalized_filename);
    const extractor = deps.extractors.find((candidate) => candidate.supports(message.mime_type, extension));
    if (!extractor) throw new Error("No extractor adapter supports this document type.");

    const extracted = await extractor.extract({
      bytes: object.bytes,
      mimeType: message.mime_type,
      extension,
      filename: document.normalized_filename
    });

    await deps.repositories.documents.updateDocument({ ...document, status: "extracted" });
    const chunks = await chunkExtractedDocument({
      extracted,
      config: deps.chunking,
      tenantId: message.tenant_id,
      organizationId: message.organization_id,
      assessmentId: message.assessment_id,
      documentId: message.document_id,
      now: nowFactory(),
      idFactory
    });

    await deps.repositories.chunks.saveChunks(chunks);

    const references: VectorReferenceResponse[] = chunks.map((chunk) => ({
      vector_reference_id: idFactory(),
      tenant_id: message.tenant_id,
      organization_id: message.organization_id,
      assessment_id: message.assessment_id,
      document_id: message.document_id,
      chunk_id: chunk.chunk_id,
      vector_provider: "cloudflare_vectorize",
      vector_index_name: deps.vectorIndexName,
      vector_id: null,
      embedding_model: null,
      embedding_status: "pending",
      created_at: nowFactory()
    }));
    await deps.repositories.vectorReferences.saveVectorReferences(references);
    await deps.repositories.documents.updateDocument({ ...document, status: "queued_for_embedding" });
    await deps.repositories.jobs.updateJob({ ...job, status: "succeeded", attempt_count: job.attempt_count + 1, started_at: now, completed_at: nowFactory() });
    await deps.repositories.audit.record("document_chunking_completed", {
      tenant_id: message.tenant_id,
      organization_id: message.organization_id,
      assessment_id: message.assessment_id,
      document_id: message.document_id,
      job_id: message.job_id,
      chunk_count: chunks.length,
      trace_id: message.trace_id,
      timestamp: nowFactory()
    });
  } catch (error) {
    await deps.repositories.documents.updateDocument({ ...document, status: "failed" });
    await deps.repositories.jobs.updateJob({
      ...job,
      status: "failed",
      attempt_count: job.attempt_count + 1,
      started_at: now,
      completed_at: nowFactory(),
      error_code: "EXTRACTION_FAILED",
      error_message_safe: safeError(error)
    });
    await deps.repositories.audit.record("document_ingestion_failed", {
      tenant_id: message.tenant_id,
      organization_id: message.organization_id,
      assessment_id: message.assessment_id,
      document_id: message.document_id,
      job_id: message.job_id,
      trace_id: message.trace_id,
      timestamp: nowFactory(),
      error_code: "EXTRACTION_FAILED"
    });
  }
};
