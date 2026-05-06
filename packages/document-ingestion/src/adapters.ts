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
}

export class InMemoryDocumentRepository implements DocumentRecordRepository {
  private readonly records = new Map<string, DocumentResponse>();

  async saveDocument(document: DocumentResponse): Promise<void> {
    this.records.set(document.document_id, document);
  }

  async getDocument(documentId: string, tenantId: string): Promise<DocumentResponse | null> {
    const record = this.records.get(documentId);
    return record?.tenant_id === tenantId ? record : null;
  }

  async listDocuments(assessmentId: string, tenantId: string): Promise<DocumentResponse[]> {
    return [...this.records.values()].filter((record) => record.assessment_id === assessmentId && record.tenant_id === tenantId);
  }

  async updateDocument(document: DocumentResponse): Promise<void> {
    this.records.set(document.document_id, document);
  }
}

export class InMemoryDocumentJobRepository implements DocumentJobRepository {
  private readonly records = new Map<string, DocumentJobResponse>();

  async saveJob(job: DocumentJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }

  async getJob(jobId: string, tenantId: string): Promise<DocumentJobResponse | null> {
    const record = this.records.get(jobId);
    return record?.tenant_id === tenantId ? record : null;
  }

  async listJobsByDocument(documentId: string, tenantId: string): Promise<DocumentJobResponse[]> {
    return [...this.records.values()].filter((record) => record.document_id === documentId && record.tenant_id === tenantId);
  }

  async listJobsByAssessment(assessmentId: string, tenantId: string): Promise<DocumentJobResponse[]> {
    return [...this.records.values()].filter((record) => record.assessment_id === assessmentId && record.tenant_id === tenantId);
  }

  async updateJob(job: DocumentJobResponse): Promise<void> {
    this.records.set(job.job_id, job);
  }
}

export class InMemoryDocumentChunkRepository implements DocumentChunkRepository {
  private readonly records: DocumentChunk[] = [];

  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    this.records.push(...chunks);
  }

  async listChunks(documentId: string, tenantId: string, limit: number, cursor?: string): Promise<DocumentChunk[]> {
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    return this.records
      .filter((record) => record.document_id === documentId && record.tenant_id === tenantId)
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .slice(start, start + limit);
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

