import type {
  AuditSink,
  DocumentChunk,
  DocumentChunkRepository,
  DocumentJobRepository,
  DocumentRecordRepository,
  QueueAdapter,
  StorageAdapter,
  StoredObject,
  VectorReferenceRepository
} from "./types";
import type { DocumentIngestionJobMessage, DocumentJobResponse, DocumentResponse, VectorReferenceResponse } from "@standard/schemas";

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly objects = new Map<string, StoredObject>();

  async putObject(object: StoredObject): Promise<void> {
    this.objects.set(object.key, object);
  }

  async getObject(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null;
  }
}

export class InMemoryQueueAdapter implements QueueAdapter {
  readonly messages: DocumentIngestionJobMessage[] = [];

  async enqueue(message: DocumentIngestionJobMessage): Promise<void> {
    this.messages.push(message);
  }

  async enqueueKbEmbeddingJob(_message: any): Promise<void> {
    // no-op for in-memory adapter
  }
}

export class InMemoryDocumentRepository implements DocumentRecordRepository {
  private readonly records = new Map<string, DocumentResponse>();

  async saveDocument(document: DocumentResponse): Promise<void> {
    this.records.set(document.document_id, document);
  }

  async getDocument(documentId: string, organizationId: string): Promise<DocumentResponse | null> {
    const record = this.records.get(documentId);
    return record?.organization_id === organizationId ? record : null;
  }

  async listDocuments(assessmentId: string, organizationId: string): Promise<DocumentResponse[]> {
    return [...this.records.values()].filter((record) => record.assessment_id === assessmentId && record.organization_id === organizationId);
  }

  async updateDocument(document: DocumentResponse): Promise<void> {
    this.records.set(document.document_id, document);
  }

  withOrganization(organizationId: string) {
    return {
      saveDocument: async (document: DocumentResponse) => this.saveDocument(document),
      getDocument: async (documentId: string) => this.getDocument(documentId, organizationId),
      listDocuments: async (assessmentId: string) => this.listDocuments(assessmentId, organizationId),
      updateDocument: async (document: DocumentResponse) => this.updateDocument(document)
    };
  }
}

export class InMemoryDocumentJobRepository implements DocumentJobRepository {
  private readonly records = new Map<string, DocumentJobResponse>();

  async saveJob(job: DocumentJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async getJob(jobId: string, organizationId: string): Promise<DocumentJobResponse | null> {
    const record = this.records.get(jobId);
    return record?.organization_id === organizationId ? record : null;
  }

  async listJobsByDocument(documentId: string, organizationId: string): Promise<DocumentJobResponse[]> {
    return [...this.records.values()].filter((record) => record.document_id === documentId && record.organization_id === organizationId);
  }

  async listJobsByAssessment(assessmentId: string, organizationId: string): Promise<DocumentJobResponse[]> {
    return [...this.records.values()].filter((record) => record.assessment_id === assessmentId && record.organization_id === organizationId);
  }

  async updateJob(job: DocumentJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  withOrganization(organizationId: string) {
    return {
      saveJob: async (job: DocumentJobResponse) => this.saveJob(job),
      getJob: async (jobId: string) => this.getJob(jobId, organizationId),
      listJobsByDocument: async (documentId: string) => this.listJobsByDocument(documentId, organizationId),
      listJobsByAssessment: async (assessmentId: string) => this.listJobsByAssessment(assessmentId, organizationId),
      updateJob: async (job: DocumentJobResponse) => this.updateJob(job)
    };
  }
}

export class InMemoryDocumentChunkRepository implements DocumentChunkRepository {
  private readonly records: DocumentChunk[] = [];

  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    this.records.push(...chunks);
  }

  async listChunks(documentId: string, organizationId: string, limit: number, cursor?: string): Promise<DocumentChunk[]> {
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    return this.records
      .filter((record) => record.document_id === documentId && record.organization_id === organizationId)
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .slice(start, start + limit);
  }

  withOrganization(organizationId: string) {
    return {
      saveChunks: async (chunks: DocumentChunk[]) => this.saveChunks(chunks),
      listChunks: async (documentId: string, limit: number, cursor?: string) => this.listChunks(documentId, organizationId, limit, cursor)
    };
  }
}

export class InMemoryVectorReferenceRepository implements VectorReferenceRepository {
  readonly records: VectorReferenceResponse[] = [];

  async saveVectorReferences(references: VectorReferenceResponse[]): Promise<void> {
    this.records.push(...references);
  }
}

export class InMemoryAuditSink implements AuditSink {
  readonly records: Array<{ event: string; metadata: Record<string, unknown> }> = [];

  async record(event: string, metadata: Record<string, unknown>): Promise<void> {
    this.records.push({ event, metadata });
  }
}

export const createInMemoryIngestionRepositories = () => ({
  documents: new InMemoryDocumentRepository(),
  jobs: new InMemoryDocumentJobRepository(),
  chunks: new InMemoryDocumentChunkRepository(),
  vectorReferences: new InMemoryVectorReferenceRepository(),
  audit: new InMemoryAuditSink()
});


