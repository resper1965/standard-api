import type { KbEmbeddingJobRepository, KbEmbeddingJobResponse, KbSearchLogRepository, KbVectorReferenceRepository, KbVectorReferenceResponse } from "../types";

export class InMemoryKbEmbeddingJobRepository implements KbEmbeddingJobRepository {
  private readonly records = new Map<string, KbEmbeddingJobResponse>();

  async saveJob(job: KbEmbeddingJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async updateJob(job: KbEmbeddingJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async getJob(jobId: string, tenantId: string): Promise<KbEmbeddingJobResponse | null> {
    const job = this.records.get(jobId);
    return job?.tenant_id === tenantId ? job : null;
  }

  async listJobsByAssessment(assessmentId: string, tenantId: string): Promise<KbEmbeddingJobResponse[]> {
    return [...this.records.values()].filter((job) => job.assessment_id === assessmentId && job.tenant_id === tenantId);
  }

  async listJobsByDocument(documentId: string, tenantId: string): Promise<KbEmbeddingJobResponse[]> {
    return [...this.records.values()].filter((job) => job.document_id === documentId && job.tenant_id === tenantId);
  }

  async findQueuedJobForChunk(chunkId: string, tenantId: string): Promise<KbEmbeddingJobResponse | null> {
    return [...this.records.values()].find((job) => job.chunk_id === chunkId && job.tenant_id === tenantId && ["queued", "running", "retrying"].includes(job.status)) ?? null;
  }
}

export class InMemoryKbVectorReferenceRepository implements KbVectorReferenceRepository {
  private readonly records = new Map<string, KbVectorReferenceResponse>();

  async save(reference: KbVectorReferenceResponse): Promise<void> {
    this.records.set(reference.vector_reference_id, reference);
  }

  async update(reference: KbVectorReferenceResponse): Promise<void> {
    this.records.set(reference.vector_reference_id, reference);
  }

  async get(referenceId: string, tenantId: string): Promise<KbVectorReferenceResponse | null> {
    const reference = this.records.get(referenceId);
    return reference?.tenant_id === tenantId ? reference : null;
  }

  async findByChunk(chunkId: string, tenantId: string): Promise<KbVectorReferenceResponse | null> {
    return [...this.records.values()].find((reference) => reference.chunk_id === chunkId && reference.tenant_id === tenantId) ?? null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<KbVectorReferenceResponse[]> {
    return [...this.records.values()].filter((reference) => reference.assessment_id === assessmentId && reference.tenant_id === tenantId);
  }

  async listByDocument(documentId: string, tenantId: string): Promise<KbVectorReferenceResponse[]> {
    return [...this.records.values()].filter((reference) => reference.document_id === documentId && reference.tenant_id === tenantId);
  }
}

export class InMemoryKbSearchLogRepository implements KbSearchLogRepository {
  private readonly records: Array<Record<string, unknown>> = [];

  async record(log: {
    id: string;
    tenant_id: string;
    organization_id: string;
    assessment_id: string;
    actor_id?: string;
    query_hash: string;
    search_type: "semantic" | "hybrid" | "text";
    filters: Record<string, unknown>;
    result_count: number;
    trace_id: string;
    created_at: string;
  }): Promise<void> {
    this.records.push(log);
  }

  async list(): Promise<Array<Record<string, unknown>>> {
    return this.records;
  }
}

export const createInMemoryKbRepositories = () => ({
  embeddingJobs: new InMemoryKbEmbeddingJobRepository(),
  vectorReferences: new InMemoryKbVectorReferenceRepository(),
  searchLogs: new InMemoryKbSearchLogRepository()
});
