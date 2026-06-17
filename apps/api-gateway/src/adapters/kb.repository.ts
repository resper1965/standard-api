/**
 * @module kb.repository
 * @description Drizzle PostgreSQL repositories for KB embedding jobs,
 * vector references, and search logs.
 */
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  kbEmbeddingJobs,
  vectorReferences,
  kbSearchLogs,
} from "@standard/schemas";
import type {
  KbEmbeddingJobResponse,
  KbVectorReferenceResponse,
  KbSearchType,
} from "@standard/schemas";
import type {
  KbEmbeddingJobRepository,
  KbVectorReferenceRepository,
  KbSearchLogRepository,
  KbRepositories,
} from "@standard/kb";
import type { DbClient } from "./db";

// ---------- Embedding Jobs ----------

const createDrizzleKbEmbeddingJobRepository = (
  db: DbClient,
): KbEmbeddingJobRepository => ({
  async saveJob(job: KbEmbeddingJobResponse) {
    await db
      .insert(kbEmbeddingJobs)
      .values({
        id: String(job.job_id) as any,
        organizationId: String(job.organization_id),
        assessmentId: String(job.assessment_id),
        documentId: String(job.document_id),
        chunkId: job.chunk_id != null ? String(job.chunk_id) : null,
        jobType: String(job.job_type) as "embed_chunk" | "re_embed_chunk",
        status: String(job.status) as
          | "queued"
          | "running"
          | "completed"
          | "failed"
          | "retrying"
          | "cancelled",
        attemptCount: Number(job.attempt_count),
        startedAt: job.started_at ? new Date(job.started_at) : null,
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        errorCode: job.error_code != null ? String(job.error_code) : null,
        errorMessageSafe:
          job.error_message_safe != null
            ? String(job.error_message_safe)
            : null,
        traceId: String(job.trace_id),
        metadata: (job.metadata ?? {}) as Record<string, unknown>,
      })
      .onConflictDoNothing();
  },

  async updateJob(job: KbEmbeddingJobResponse) {
    await db
      .update(kbEmbeddingJobs)
      .set({
        status: String(job.status) as
          | "queued"
          | "running"
          | "completed"
          | "failed"
          | "retrying"
          | "cancelled",
        attemptCount: Number(job.attempt_count),
        startedAt: job.started_at ? new Date(job.started_at) : null,
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        errorCode: job.error_code != null ? String(job.error_code) : null,
        errorMessageSafe:
          job.error_message_safe != null
            ? String(job.error_message_safe)
            : null,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(kbEmbeddingJobs.id, String(job.job_id)),
          eq(kbEmbeddingJobs.organizationId, String(job.organization_id)),
        ),
      );
  },

  async getJob(jobId: string, organizationId: string) {
    const [row] = await db
      .select()
      .from(kbEmbeddingJobs)
      .where(
        and(
          eq(kbEmbeddingJobs.id, jobId),
          eq(kbEmbeddingJobs.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ? mapEmbeddingJobRow(row) : null;
  },

  async listJobsByAssessment(assessmentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(kbEmbeddingJobs)
      .where(
        and(
          eq(kbEmbeddingJobs.assessmentId, assessmentId),
          eq(kbEmbeddingJobs.organizationId, organizationId),
        ),
      );
    return rows.map(mapEmbeddingJobRow);
  },

  async listJobsByDocument(documentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(kbEmbeddingJobs)
      .where(
        and(
          eq(kbEmbeddingJobs.documentId, documentId),
          eq(kbEmbeddingJobs.organizationId, organizationId),
        ),
      );
    return rows.map(mapEmbeddingJobRow);
  },

  async findQueuedJobForChunk(chunkId: string, organizationId: string) {
    const [row] = await db
      .select()
      .from(kbEmbeddingJobs)
      .where(
        and(
          eq(kbEmbeddingJobs.chunkId, chunkId),
          eq(kbEmbeddingJobs.organizationId, organizationId),
          inArray(kbEmbeddingJobs.status, ["queued", "running", "retrying"]),
        ),
      )
      .limit(1);
    return row ? mapEmbeddingJobRow(row) : null;
  },
});

type EmbeddingJobRow = typeof kbEmbeddingJobs.$inferSelect;
const mapEmbeddingJobRow = (row: EmbeddingJobRow): KbEmbeddingJobResponse => ({
  job_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  document_id: row.documentId,
  chunk_id: row.chunkId ?? undefined,
  vector_reference_id: undefined, // Not stored in embedding job table
  job_type: row.jobType as KbEmbeddingJobResponse["job_type"],
  status: row.status as KbEmbeddingJobResponse["status"],
  attempt_count: row.attemptCount,
  queued_at: row.queuedAt.toISOString(),
  started_at: row.startedAt?.toISOString(),
  completed_at: row.completedAt?.toISOString(),
  error_code: row.errorCode ?? undefined,
  error_message_safe: row.errorMessageSafe ?? undefined,
  trace_id: row.traceId,
  embedding_model:
    ((row.metadata as Record<string, unknown>)?.embedding_model as string) ??
    "",
  vector_index_name:
    ((row.metadata as Record<string, unknown>)?.vector_index_name as string) ??
    "",
  metadata: (row.metadata ?? {}) as Record<string, unknown>,
});

// ---------- KB Vector References ----------

const createDrizzleKbVectorReferenceRepository = (
  db: DbClient,
): KbVectorReferenceRepository => ({
  async save(ref: KbVectorReferenceResponse) {
    await db
      .insert(vectorReferences)
      .values({
        id: String(ref.vector_reference_id) as any,
        organizationId: String(ref.organization_id),
        assessmentId: String(ref.assessment_id),
        kbEntryId: String(ref.chunk_id), // Maps to kbEntries via chunk-based lookup
        vectorProvider: String(ref.vector_provider),
        vectorIndexName: String(ref.vector_index_name),
        vectorId:
          ref.vector_id != null
            ? String(ref.vector_id)
            : `pending_${String(ref.chunk_id)}`,
        metadata: {
          embedding_model: ref.embedding_model,
          embedding_dimensions: ref.embedding_dimensions,
          embedding_status: ref.embedding_status,
          embedded_at: ref.embedded_at,
          last_error_safe: ref.last_error_safe,
          document_id: ref.document_id,
        } as Record<string, unknown>,
      })
      .onConflictDoNothing();
  },

  async update(ref: KbVectorReferenceResponse) {
    await db
      .update(vectorReferences)
      .set({
        vectorId:
          ref.vector_id != null
            ? String(ref.vector_id)
            : `pending_${String(ref.chunk_id)}`,
        metadata: {
          embedding_model: ref.embedding_model,
          embedding_dimensions: ref.embedding_dimensions,
          embedding_status: ref.embedding_status,
          embedded_at: ref.embedded_at,
          last_error_safe: ref.last_error_safe,
          document_id: ref.document_id,
        } as Record<string, unknown>,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(vectorReferences.id, String(ref.vector_reference_id)),
          eq(vectorReferences.organizationId, String(ref.organization_id)),
        ),
      );
  },

  async get(referenceId: string, organizationId: string) {
    const [row] = await db
      .select()
      .from(vectorReferences)
      .where(
        and(
          eq(vectorReferences.id, referenceId),
          eq(vectorReferences.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ? mapVectorRefRow(row) : null;
  },

  async findByChunk(chunkId: string, organizationId: string) {
    const [row] = await db
      .select()
      .from(vectorReferences)
      .where(
        and(
          eq(vectorReferences.kbEntryId, chunkId),
          eq(vectorReferences.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ? mapVectorRefRow(row) : null;
  },

  async listByAssessment(assessmentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(vectorReferences)
      .where(
        and(
          eq(vectorReferences.assessmentId, assessmentId),
          eq(vectorReferences.organizationId, organizationId),
        ),
      );
    return rows.map(mapVectorRefRow);
  },

  async listByDocument(documentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(vectorReferences)
      .where(
        and(
          eq(vectorReferences.assessmentId, documentId),
          eq(vectorReferences.organizationId, organizationId),
        ),
      );
    return rows.map(mapVectorRefRow);
  },
});

type VectorRefRow = typeof vectorReferences.$inferSelect;
const mapVectorRefRow = (row: VectorRefRow): KbVectorReferenceResponse => {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    vector_reference_id: row.id,
    organization_id: row.organizationId,
    assessment_id: row.assessmentId,
    document_id: (meta.document_id as string) ?? "",
    chunk_id: row.kbEntryId,
    vector_provider: row.vectorProvider,
    vector_index_name: row.vectorIndexName,
    vector_id: row.vectorId,
    embedding_model: (meta.embedding_model as string) ?? null,
    embedding_dimensions: (meta.embedding_dimensions as number) ?? null,
    embedding_status:
      (meta.embedding_status as KbVectorReferenceResponse["embedding_status"]) ??
      "pending",
    embedded_at: (meta.embedded_at as string) ?? undefined,
    last_error_safe: (meta.last_error_safe as string) ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
};

// ---------- Search Logs ----------

const createDrizzleKbSearchLogRepository = (
  db: DbClient,
): KbSearchLogRepository => ({
  async record(log) {
    await db.insert(kbSearchLogs).values({
      id: String(log.id) as any,
      organizationId: String(log.organization_id),
      assessmentId: String(log.assessment_id),
      actorId: log.actor_id != null ? String(log.actor_id) : null,
      queryHash: String(log.query_hash),
      searchType: String(log.search_type) as
        | "semantic"
        | "keyword"
        | "hybrid"
        | "exact",
      filters: (log.filters ?? {}) as Record<string, unknown>,
      resultCount: Number(log.result_count),
      traceId: String(log.trace_id),
    });
  },

  async list() {
    const rows = await db.select().from(kbSearchLogs).limit(100);
    return rows.map((row) => ({
      id: row.id,
      organization_id: row.organizationId,
      query_hash: row.queryHash,
      search_type: row.searchType as KbSearchType,
      result_count: row.resultCount,
      trace_id: row.traceId,
      created_at: row.createdAt.toISOString(),
    }));
  },
});

// ---------- Factory ----------

export const createDrizzleKbRepositories = (db: DbClient): KbRepositories => ({
  embeddingJobs: createDrizzleKbEmbeddingJobRepository(db),
  vectorReferences: createDrizzleKbVectorReferenceRepository(db),
  searchLogs: createDrizzleKbSearchLogRepository(db),
});

