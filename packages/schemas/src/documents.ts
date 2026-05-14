import { z } from "zod";
import { UuidSchema } from "./common";

export const DocumentStatusSchema = z.enum([
  "uploaded",
  "queued_for_extraction",
  "extracting",
  "extracted",
  "chunked",
  "queued_for_embedding",
  "embedded",
  "failed",
  "rejected",
  "archived"
]);

export const MalwareScanStatusSchema = z.enum(["pending", "clean", "infected", "error", "skipped"]);

export const DocumentJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed", "skipped", "cancelled", "retrying"]);
export const DocumentJobTypeSchema = z.enum(["extract_and_chunk", "reprocess", "prepare_embedding"]);
export const EmbeddingStatusSchema = z.enum(["pending", "queued", "embedded", "failed", "skipped"]);

export const FileValidationResultSchema = z.object({
  accepted: z.boolean(),
  normalized_filename: z.string(),
  extension: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().nonnegative(),
  content_hash: z.string(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export const CreateDocumentRequestSchema = z.object({
  original_filename: z.string().min(1),
  mime_type: z.string().min(1),
  file_size: z.number().int().positive(),
  content_hash: z.string().optional(),
  classification: z.string().default("internal"),
  document_type: z.string().default("assessment_document"),
  language: z.string().default("und"),
  version_label: z.string().optional(),
  effective_date: z.string().optional()
});

export const DocumentResponseSchema = z.object({
  document_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  original_filename: z.string(),
  normalized_filename: z.string(),
  storage_provider: z.string(),
  storage_bucket: z.string(),
  storage_key: z.string(),
  content_hash: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().nonnegative(),
  uploaded_by: UuidSchema,
  uploaded_at: z.string(),
  classification: z.string(),
  document_type: z.string(),
  language: z.string(),
  version_label: z.string().optional(),
  effective_date: z.string().optional(),
  status: DocumentStatusSchema,
  scan_status: MalwareScanStatusSchema,
  malware_signature: z.string().nullable().optional(),
  scanned_at: z.string().nullable().optional(),
  trace_id: z.string()
});

export const CreateDocumentResponseSchema = z.object({
  document: DocumentResponseSchema,
  job: z.lazy(() => DocumentJobResponseSchema),
  trace_id: z.string()
});

export const DocumentListResponseSchema = z.object({
  data: z.array(DocumentResponseSchema),
  trace_id: z.string()
});

export const DocumentChunkResponseSchema = z.object({
  chunk_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  document_version_id: UuidSchema.optional(),
  chunk_index: z.number().int().nonnegative(),
  chunk_text: z.string(),
  text_hash: z.string(),
  token_count_estimate: z.number().int().nonnegative(),
  page_number: z.number().int().positive().optional(),
  location_metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string()
});

export const DocumentJobResponseSchema = z.object({
  job_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  job_type: DocumentJobTypeSchema,
  status: DocumentJobStatusSchema,
  attempt_count: z.number().int().nonnegative(),
  error_code: z.string().optional(),
  error_message_safe: z.string().optional(),
  queued_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  trace_id: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const ReprocessDocumentRequestSchema = z.object({
  reason: z.string().min(1),
  strategy: z.enum(["append_new_chunks", "replace_previous_chunks"]).default("append_new_chunks")
});

export const DocumentIngestionJobMessageSchema = z.object({
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  job_id: UuidSchema,
  storage_key: z.string(),
  mime_type: z.string(),
  trace_id: z.string(),
  requested_by: UuidSchema,
  created_at: z.string()
});

export const VectorReferenceResponseSchema = z.object({
  vector_reference_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  vector_provider: z.string(),
  vector_index_name: z.string(),
  vector_id: z.string().nullable(),
  embedding_model: z.string().nullable(),
  embedding_status: EmbeddingStatusSchema,
  created_at: z.string()
});

export const ExtractedDocumentSchema = z.object({
  text: z.string(),
  pages: z.array(z.object({ page_number: z.number().int().positive(), text: z.string() })).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  warnings: z.array(z.string()).default([])
});

export const ChunkingConfigSchema = z.object({
  max_tokens_estimate: z.number().int().min(50).default(800),
  overlap_tokens_estimate: z.number().int().min(0).default(80),
  strategy: z.enum(["by_tokens_estimate", "by_paragraphs", "by_pages"]).default("by_tokens_estimate"),
  preserve_headings: z.boolean().default(true),
  preserve_pages: z.boolean().default(true)
});

export type MalwareScanStatus = z.infer<typeof MalwareScanStatusSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentJobStatus = z.infer<typeof DocumentJobStatusSchema>;
export type DocumentJobType = z.infer<typeof DocumentJobTypeSchema>;
export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;
export type DocumentChunkResponse = z.infer<typeof DocumentChunkResponseSchema>;
export type DocumentJobResponse = z.infer<typeof DocumentJobResponseSchema>;
export type DocumentIngestionJobMessage = z.infer<typeof DocumentIngestionJobMessageSchema>;
export type VectorReferenceResponse = z.infer<typeof VectorReferenceResponseSchema>;
export type FileValidationResult = z.infer<typeof FileValidationResultSchema>;
export type ExtractedDocument = z.infer<typeof ExtractedDocumentSchema>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
