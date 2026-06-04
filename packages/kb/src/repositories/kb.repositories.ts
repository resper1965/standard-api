import type { KbEmbeddingJobRepository, KbEmbeddingJobResponse, KbSearchLogRepository, KbVectorReferenceRepository, KbVectorReferenceResponse } from "../types";

export class InMemoryKbEmbeddingJobRepository implements KbEmbeddingJobRepository {
  private readonly records = new Map<string, KbEmbeddingJobResponse>();

  async saveJob(job: KbEmbeddingJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async updateJob(job: KbEmbeddingJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async getJob(jobId: string, organizationId: string): Promise<KbEmbeddingJobResponse | null> {
    const job = this.records.get(jobId);
    return job?.organization_id === organizationId ? job : null;
  }

  async listJobsByAssessment(assessmentId: string, organizationId: string): Promise<KbEmbeddingJobResponse[]> {
    return [...this.records.values()].filter((job) => job.assessment_id === assessmentId && job.organization_id === organizationId);
  }

  async listJobsByDocument(documentId: string, organizationId: string): Promise<KbEmbeddingJobResponse[]> {
    return [...this.records.values()].filter((job) => job.document_id === documentId && job.organization_id === organizationId);
  }

  async findQueuedJobForChunk(chunkId: string, organizationId: string): Promise<KbEmbeddingJobResponse | null> {
    return [...this.records.values()].find((job) => job.chunk_id === chunkId && job.organization_id === organizationId && ["queued", "running", "retrying"].includes(job.status)) ?? null;
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

  async get(referenceId: string, organizationId: string): Promise<KbVectorReferenceResponse | null> {
    const reference = this.records.get(referenceId);
    return reference?.organization_id === organizationId ? reference : null;
  }

  async findByChunk(chunkId: string, organizationId: string): Promise<KbVectorReferenceResponse | null> {
    return [...this.records.values()].find((reference) => reference.chunk_id === chunkId && reference.organization_id === organizationId) ?? null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<KbVectorReferenceResponse[]> {
    return [...this.records.values()].filter((reference) => reference.assessment_id === assessmentId && reference.organization_id === organizationId);
  }

  async listByDocument(documentId: string, organizationId: string): Promise<KbVectorReferenceResponse[]> {
    return [...this.records.values()].filter((reference) => reference.document_id === documentId && reference.organization_id === organizationId);
  }
}

export class InMemoryKbSearchLogRepository implements KbSearchLogRepository {
  private readonly records: Array<Record<string, unknown>> = [];

  async record(log: {
    id: string;
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
