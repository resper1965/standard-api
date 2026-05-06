import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { kbEmbeddingJobs, kbSearchLogs, vectorReferences } from "@standard/schemas";
import type { 
  KbEmbeddingJobRepository, 
  KbVectorReferenceRepository, 
  KbSearchLogRepository,
  KbEmbeddingJobResponse,
  KbVectorReferenceResponse
} from "./types";

export class DrizzleKbEmbeddingJobRepository implements KbEmbeddingJobRepository {
  constructor(private readonly db: any) {}

  async saveJob(job: KbEmbeddingJobResponse): Promise<void> {
    await this.db.insert(kbEmbeddingJobs).values({
      id: job.id,
      tenantId: job.tenant_id,
      organizationId: job.organization_id,
      assessmentId: job.assessment_id,
      documentId: job.document_id,
      chunkId: job.chunk_id,
      jobType: job.job_type,
      status: job.status,
      attemptCount: job.attempt_count,
      queuedAt: new Date(job.queued_at),
      startedAt: job.started_at ? new Date(job.started_at) : null,
      completedAt: job.completed_at ? new Date(job.completed_at) : null,
      errorCode: job.error_code,
      errorMessageSafe: job.error_message_safe,
      traceId: job.trace_id,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at)
    }).onConflictDoUpdate({
      target: kbEmbeddingJobs.id,
      set: {
        status: job.status,
        attemptCount: job.attempt_count,
        startedAt: job.started_at ? new Date(job.started_at) : null,
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        errorCode: job.error_code,
        errorMessageSafe: job.error_message_safe,
        updatedAt: new Date(job.updated_at)
      }
    });
  }

  async updateJob(job: KbEmbeddingJobResponse): Promise<void> {
    await this.saveJob(job);
  }

  async getJob(jobId: string, tenantId: string): Promise<KbEmbeddingJobResponse | null> {
    const result = await this.db.select().from(kbEmbeddingJobs).where(and(eq(kbEmbeddingJobs.id, jobId), eq(kbEmbeddingJobs.tenantId, tenantId))).limit(1);
    const row = result[0];
    if (!row) return null;
    return this.mapToJob(row);
  }

  async listJobsByAssessment(assessmentId: string, tenantId: string): Promise<KbEmbeddingJobResponse[]> {
    const results = await this.db.select().from(kbEmbeddingJobs).where(and(eq(kbEmbeddingJobs.assessmentId, assessmentId), eq(kbEmbeddingJobs.tenantId, tenantId)));
    return results.map((row: any) => this.mapToJob(row));
  }

  async listJobsByDocument(documentId: string, tenantId: string): Promise<KbEmbeddingJobResponse[]> {
    const results = await this.db.select().from(kbEmbeddingJobs).where(and(eq(kbEmbeddingJobs.documentId, documentId), eq(kbEmbeddingJobs.tenantId, tenantId)));
    return results.map((row: any) => this.mapToJob(row));
  }

  async findQueuedJobForChunk(chunkId: string, tenantId: string): Promise<KbEmbeddingJobResponse | null> {
    const result = await this.db.select().from(kbEmbeddingJobs).where(and(eq(kbEmbeddingJobs.chunkId, chunkId), eq(kbEmbeddingJobs.tenantId, tenantId), eq(kbEmbeddingJobs.status, "queued"))).limit(1);
    const row = result[0];
    if (!row) return null;
    return this.mapToJob(row);
  }

  private mapToJob(row: any): KbEmbeddingJobResponse {
    return {
      id: row.id,
      tenant_id: row.tenantId,
      organization_id: row.organizationId,
      assessment_id: row.assessmentId,
      document_id: row.documentId,
      chunk_id: row.chunkId,
      job_type: row.jobType,
      status: row.status,
      attempt_count: row.attemptCount,
      queued_at: row.queuedAt.toISOString(),
      started_at: row.startedAt?.toISOString() ?? null,
      completed_at: row.completedAt?.toISOString() ?? null,
      error_code: row.errorCode,
      error_message_safe: row.errorMessageSafe,
      trace_id: row.traceId,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString()
    };
  }
}

export class DrizzleKbVectorReferenceRepository implements KbVectorReferenceRepository {
  constructor(private readonly db: any) {}

  async save(reference: KbVectorReferenceResponse): Promise<void> {
    await this.db.insert(vectorReferences).values({
      id: reference.id,
      tenantId: reference.tenant_id,
      organizationId: reference.organization_id,
      assessmentId: reference.assessment_id,
      kbEntryId: reference.kb_entry_id ?? reference.id, // For fallback
      vectorProvider: reference.vector_provider,
      vectorIndexName: reference.vector_index_name,
      vectorId: reference.vector_id ?? "",
      createdAt: new Date(reference.created_at),
      updatedAt: new Date(reference.updated_at)
      // FIXME embedding_status and model etc. are actually in the schema for document-ingestion's vector_references but might not be fully overlapping. 
      // The schemas package might have them separated or they are in metadata.
    }).onConflictDoUpdate({
      target: vectorReferences.id,
      set: {
        vectorId: reference.vector_id ?? "",
        updatedAt: new Date(reference.updated_at)
        // update embedding rules if metadata allows
      }
    });
  }

  async update(reference: KbVectorReferenceResponse): Promise<void> {
    await this.save(reference);
  }

  async get(referenceId: string, tenantId: string): Promise<KbVectorReferenceResponse | null> {
    const result = await this.db.select().from(vectorReferences).where(and(eq(vectorReferences.id, referenceId), eq(vectorReferences.tenantId, tenantId))).limit(1);
    const row = result[0];
    if (!row) return null;
    return this.mapToReference(row);
  }

  async findByChunk(chunkId: string, tenantId: string): Promise<KbVectorReferenceResponse | null> {
    // Actually the KB reference connects to kb_entries. So we look up kb_entries first, or use a join.
    throw new Error("findByChunk not fully implemented in Drizzle Adapter");
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<KbVectorReferenceResponse[]> {
    const results = await this.db.select().from(vectorReferences).where(and(eq(vectorReferences.assessmentId, assessmentId), eq(vectorReferences.tenantId, tenantId)));
    return results.map((row: any) => this.mapToReference(row));
  }

  async listByDocument(documentId: string, tenantId: string): Promise<KbVectorReferenceResponse[]> {
    throw new Error("listByDocument not fully implemented in Drizzle Adapter due to join requirement.");
  }

  private mapToReference(row: any): KbVectorReferenceResponse {
    return {
      id: row.id,
      tenant_id: row.tenantId,
      organization_id: row.organizationId,
      assessment_id: row.assessmentId,
      kb_entry_id: row.kbEntryId,
      vector_provider: row.vectorProvider,
      vector_index_name: row.vectorIndexName,
      vector_id: row.vectorId,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      embedding_status: "embedded", // mapping mock
      embedding_model: null,
      embedding_dimensions: null,
      embedded_at: row.updatedAt.toISOString(),
      last_error_safe: null
    };
  }
}

export class DrizzleKbSearchLogRepository implements KbSearchLogRepository {
  constructor(private readonly db: any) {}

  async record(log: any): Promise<void> {
    await this.db.insert(kbSearchLogs).values({
      id: log.id,
      tenantId: log.tenant_id,
      organizationId: log.organization_id,
      assessmentId: log.assessment_id,
      actorId: log.actor_id,
      queryHash: log.query_hash,
      searchType: log.search_type,
      filters: log.filters,
      resultCount: log.result_count,
      traceId: log.trace_id,
      createdAt: new Date(log.created_at)
    });
  }

  async list(): Promise<Array<Record<string, unknown>>> {
    return await this.db.select().from(kbSearchLogs);
  }
}

