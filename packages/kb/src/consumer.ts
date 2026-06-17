import type { DocumentChunk } from "@standard/document-ingestion";
import type { KbEmbeddingJobMessage, KbServiceDependencies } from "./types";

const safeError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message.slice(0, 240);
  return "KB embedding job failed.";
};

const findChunk = async (deps: KbServiceDependencies, message: KbEmbeddingJobMessage): Promise<DocumentChunk | null> => {
  const chunks = await deps.documentIngestion.repositories.chunks.listChunks(message.document_id, message.organization_id, 1000);
  return chunks.find((chunk) => chunk.chunk_id === message.chunk_id && chunk.assessment_id === message.assessment_id) ?? null;
};

export const processKbEmbeddingJob = async (message: KbEmbeddingJobMessage, deps: KbServiceDependencies): Promise<void> => {
  const job = await deps.repositories.embeddingJobs.getJob(message.job_id, message.organization_id);
  const reference = await deps.repositories.vectorReferences.get(message.vector_reference_id, message.organization_id);
  const now = new Date().toISOString();

  if (!job || !reference) return;

  await deps.repositories.embeddingJobs.updateJob({
    ...job,
    status: "running",
    attempt_count: job.attempt_count + 1,
    started_at: now
  });

  try {
    const chunk = await findChunk(deps, message);
    if (!chunk) throw new Error("Chunk not found for KB embedding job.");
    if (chunk.organization_id !== message.organization_id || chunk.assessment_id !== message.assessment_id) {
      throw new Error("KB embedding job tenant or assessment mismatch.");
    }
    const document = await deps.documentIngestion.repositories.documents.getDocument(chunk.document_id, chunk.organization_id);
    if (!document) throw new Error("Document not found for KB embedding job.");

    await deps.repositories.vectorReferences.update({
      ...reference,
      embedding_status: "embedding",
      updated_at: now
    });

    const embedding = await deps.embeddingProvider.embedText(chunk.chunk_text);
    const vectorId = `kb_${chunk.chunk_id}`;
    await deps.vectorStore.upsert([
      {
        id: vectorId,
        values: embedding.vector,
        metadata: {
          organization_id: chunk.organization_id,
          assessment_id: chunk.assessment_id,
          document_id: chunk.document_id,
          chunk_id: chunk.chunk_id,
          content_hash: document.content_hash,
          text_hash: chunk.text_hash,
          document_type: document.document_type,
          ...(chunk.page_number ? { page_number: chunk.page_number } : {}),
          created_at: now
        }
      }
    ]);

    await deps.repositories.vectorReferences.update({
      ...reference,
      vector_id: vectorId,
      embedding_model: embedding.model,
      embedding_dimensions: embedding.dimensions,
      embedding_status: "embedded",
      embedded_at: now,
      updated_at: now
    });

    await deps.repositories.embeddingJobs.updateJob({
      ...job,
      status: "succeeded",
      attempt_count: job.attempt_count + 1,
      started_at: job.started_at ?? now,
      completed_at: now
    });
  } catch (error) {
    const messageSafe = safeError(error);
    await deps.repositories.vectorReferences.update({
      ...reference,
      embedding_status: "failed",
      last_error_safe: messageSafe,
      updated_at: now
    });
    await deps.repositories.embeddingJobs.updateJob({
      ...job,
      status: "failed",
      attempt_count: job.attempt_count + 1,
      started_at: job.started_at ?? now,
      completed_at: now,
      error_code: "KB_EMBEDDING_FAILED",
      error_message_safe: messageSafe
    });
  }
};


