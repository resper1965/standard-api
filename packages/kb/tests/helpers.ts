import { createInMemoryDocumentIngestionDependencies } from "@standard/document-ingestion";
import { createInMemoryKbDependencies } from "../src";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  documentId: "44444444-4444-4444-8444-444444444444",
  chunkId: "55555555-5555-4555-8555-555555555555",
  actorId: "66666666-6666-4666-8666-666666666666"
};

export const createKbFixture = async () => {
  const documentIngestion = createInMemoryDocumentIngestionDependencies();
  await documentIngestion.repositories.documents.saveDocument({
    document_id: ids.documentId,
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    original_filename: "synthetic-policy.txt",
    normalized_filename: "synthetic-policy.txt",
    storage_provider: "mock_r2",
    storage_bucket: "bucket",
    storage_key: "key",
    content_hash: "content-hash",
    mime_type: "text/plain",
    file_size: 123,
    uploaded_by: ids.actorId,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    classification: "internal",
    document_type: "policy",
    language: "pt-BR",
    status: "chunked",
    trace_id: "trace-test"
  });
  await documentIngestion.repositories.chunks.saveChunks([
    {
      chunk_id: ids.chunkId,
      tenant_id: ids.tenantId,
      organization_id: ids.organizationId,
      assessment_id: ids.assessmentId,
      document_id: ids.documentId,
      chunk_index: 0,
      chunk_text: "Synthetic access control policy evidence for KB retrieval.",
      text_hash: "text-hash",
      token_count_estimate: 10,
      location_metadata: { document_type: "policy" },
      created_at: "2026-01-01T00:00:00.000Z"
    }
  ]);
  return createInMemoryKbDependencies(documentIngestion);
};

