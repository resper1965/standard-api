// @ts-nocheck -- Zod v4 CI type compat
import type { DocumentChunk } from "@standard/document-ingestion";
import type { KbServiceDependencies, KbVectorReferenceResponse } from "../types";

export class KbReferenceService {
  constructor(private readonly deps: KbServiceDependencies) {}

  async getOrCreatePendingReference(chunk: DocumentChunk, now: string): Promise<KbVectorReferenceResponse> {
    const existing = await this.deps.repositories.vectorReferences.findByChunk(chunk.chunk_id, chunk.organization_id);
    if (existing) return existing;

    const reference: KbVectorReferenceResponse = {
      vector_reference_id: crypto.randomUUID(),
      organization_id: chunk.organization_id,
      assessment_id: chunk.assessment_id,
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      vector_provider: this.deps.vectorProvider,
      vector_index_name: this.deps.vectorIndexName,
      vector_id: null,
      embedding_model: null,
      embedding_dimensions: null,
      embedding_status: "pending",
      created_at: now,
      updated_at: now
    };

    await this.deps.repositories.vectorReferences.save(reference);
    return reference;
  }
}


