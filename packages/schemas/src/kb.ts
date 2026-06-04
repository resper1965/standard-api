import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const KbEmbeddingStatusSchema = z.enum(["pending", "queued", "embedding", "embedded", "failed", "skipped", "reprocess_required"]);
export const KbEmbeddingJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed", "skipped", "cancelled", "retrying"]);
export const KbEmbeddingJobTypeSchema = z.enum(["embed_chunk", "embed_document", "reindex_document"]);
export const KbSearchTypeSchema = z.enum(["semantic", "hybrid", "text"]);
export const KbRetrievalMethodSchema = z.enum(["vector", "hybrid", "text"]);

export const VectorStoreMetadataSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  content_hash: z.string(),
  text_hash: z.string(),
  document_type: z.string(),
  page_number: z.number().int().positive().optional(),
  created_at: z.string()
});

export const EmbeddingProviderConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  dimensions: z.number().int().positive(),
  ai_gateway_route: z.string().optional()
});

export const KbVectorReferenceResponseSchema = z.object({
  vector_reference_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  vector_provider: z.string(),
  vector_index_name: z.string(),
  vector_id: z.string().nullable(),
  embedding_model: z.string().nullable(),
  embedding_dimensions: z.number().int().positive().nullable(),
  embedding_status: KbEmbeddingStatusSchema,
  embedded_at: z.string().optional(),
  last_error_safe: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const KbEmbeddingJobResponseSchema = z.object({
  job_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema.optional(),
  vector_reference_id: UuidSchema.optional(),
  job_type: KbEmbeddingJobTypeSchema,
  status: KbEmbeddingJobStatusSchema,
  attempt_count: z.number().int().nonnegative(),
  queued_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error_code: z.string().optional(),
  error_message_safe: z.string().optional(),
  trace_id: TraceIdSchema,
  embedding_model: z.string(),
  vector_index_name: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const KbIndexRequestSchema = z.strictObject({
  document_id: UuidSchema.optional(),
  force_reindex: z.boolean().default(false)
});

export const KbIndexResponseSchema = z.object({
  assessment_id: UuidSchema,
  queued_job_ids: z.array(UuidSchema),
  vector_reference_ids: z.array(UuidSchema),
  skipped_chunk_ids: z.array(UuidSchema),
  trace_id: TraceIdSchema
});

export const KbReindexDocumentRequestSchema = z.strictObject({
  reason: z.string().min(1),
  force_reindex: z.boolean().default(true)
});

export const KbSearchFiltersSchema = z.object({
  document_type: z.string().optional(),
  document_id: UuidSchema.optional(),
  language: z.string().optional(),
  classification: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional()
});

export const KbSearchRequestSchema = z.strictObject({
  query: z.string().min(1).max(2000),
  search_type: KbSearchTypeSchema.default("semantic"),
  filters: KbSearchFiltersSchema.default({}),
  top_k: z.number().int().min(1).max(20).default(5),
  include_context: z.boolean().default(false)
});

export const KbSearchResultSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  vector_reference_id: UuidSchema.optional(),
  score: z.number(),
  snippet: z.string(),
  page_number: z.number().int().positive().optional(),
  document_type: z.string(),
  document_title: z.string(),
  retrieval_method: KbRetrievalMethodSchema,
  candidate_evidence: z.literal(true),
  trace_id: TraceIdSchema
});

export const KbSearchResponseSchema = z.object({
  assessment_id: UuidSchema,
  search_type: KbSearchTypeSchema,
  candidate_evidence: z.literal(true),
  warning: z.string(),
  data: z.array(KbSearchResultSchema),
  trace_id: TraceIdSchema
});

export const ChunkContextResponseSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  snippet: z.string(),
  previous_chunk_id: UuidSchema.optional(),
  next_chunk_id: UuidSchema.optional(),
  candidate_evidence: z.literal(true),
  trace_id: TraceIdSchema
});

export const KbEmbeddingJobMessageSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  vector_reference_id: UuidSchema,
  job_id: UuidSchema,
  embedding_model: z.string(),
  vector_index_name: z.string(),
  trace_id: TraceIdSchema,
  requested_by: UuidSchema.optional(),
  created_at: z.string()
});

export type KbEmbeddingStatus = z.infer<typeof KbEmbeddingStatusSchema>;
export type KbEmbeddingJobStatus = z.infer<typeof KbEmbeddingJobStatusSchema>;
export type KbEmbeddingJobType = z.infer<typeof KbEmbeddingJobTypeSchema>;
export type KbSearchType = z.infer<typeof KbSearchTypeSchema>;
export type KbRetrievalMethod = z.infer<typeof KbRetrievalMethodSchema>;
export type VectorStoreMetadata = z.infer<typeof VectorStoreMetadataSchema>;
export type EmbeddingProviderConfig = z.infer<typeof EmbeddingProviderConfigSchema>;
export type KbVectorReferenceResponse = z.infer<typeof KbVectorReferenceResponseSchema>;
export type KbEmbeddingJobResponse = z.infer<typeof KbEmbeddingJobResponseSchema>;
export type KbIndexRequest = z.infer<typeof KbIndexRequestSchema>;
export type KbIndexResponse = z.infer<typeof KbIndexResponseSchema>;
export type KbReindexDocumentRequest = z.infer<typeof KbReindexDocumentRequestSchema>;
export type KbSearchFilters = z.infer<typeof KbSearchFiltersSchema>;
export type KbSearchRequest = z.infer<typeof KbSearchRequestSchema>;
export type KbSearchResult = z.infer<typeof KbSearchResultSchema>;
export type KbSearchResponse = z.infer<typeof KbSearchResponseSchema>;
export type ChunkContextResponse = z.infer<typeof ChunkContextResponseSchema>;
export type KbEmbeddingJobMessage = z.infer<typeof KbEmbeddingJobMessageSchema>;
