// @ts-nocheck -- Zod v4 CI type compat
import type {
  ChunkingConfig,
  DocumentIngestionJobMessage,
  DocumentJobResponse,
  DocumentResponse,
  ExtractedDocument,
  VectorReferenceResponse
} from "@standard/schemas";

export type FileDescriptor = {
  originalFilename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type UploadContext = {
  organizationId: string;
  assessmentId: string;
  actorId: string;
  traceId: string;
  now: string;
};

export type ValidatedUpload = {
  normalizedFilename: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  contentHash: string;
  storageKey: string;
  warnings: string[];
};

export type StoredObject = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  contentHash: string;
  metadata: Record<string, string>;
};

export type StorageAdapter = {
  /** Persist a file object to the storage backend. */
  putObject(object: StoredObject): Promise<void>;
  /** 
   * Stateless environment: We only fetch temporary/presigned URLs provided by the Main App.
   * We do not persist raw files permanently in our own pipeline.
   */
  getObject(keyOrUrl: string): Promise<StoredObject | null>;
};

export type MalwareScanResult = {
  clean: boolean;
  threats: string[];
  scanDurationMs: number;
};

export type MalwareScannerAdapter = {
  scan(input: {
    bytes: Uint8Array;
    filename: string;
    mimeType: string;
    traceId: string;
  }): Promise<MalwareScanResult>;
};

export type QueueAdapter = {
  enqueue(message: DocumentIngestionJobMessage): Promise<void>;
  enqueueKbEmbeddingJob(message: any): Promise<void>; // using any temporarily to avoid circular deps
};

export interface TenantScopedDocumentRecordRepository {
  saveDocument(document: DocumentResponse): Promise<void>;
  getDocument(documentId: string): Promise<DocumentResponse | null>;
  listDocuments(assessmentId: string): Promise<DocumentResponse[]>;
  updateDocument(document: DocumentResponse): Promise<void>;
}

export type DocumentRecordRepository = {
  saveDocument(document: DocumentResponse): Promise<void>;
  getDocument(documentId: string, organizationId: string): Promise<DocumentResponse | null>;
  listDocuments(assessmentId: string, organizationId: string): Promise<DocumentResponse[]>;
  updateDocument(document: DocumentResponse): Promise<void>;
  withOrganization(organizationId: string): TenantScopedDocumentRecordRepository;
};

export interface TenantScopedDocumentJobRepository {
  saveJob(job: DocumentJobResponse): Promise<void>;
  getJob(jobId: string): Promise<DocumentJobResponse | null>;
  listJobsByDocument(documentId: string): Promise<DocumentJobResponse[]>;
  listJobsByAssessment(assessmentId: string): Promise<DocumentJobResponse[]>;
  updateJob(job: DocumentJobResponse): Promise<void>;
}

export type DocumentJobRepository = {
  saveJob(job: DocumentJobResponse): Promise<void>;
  getJob(jobId: string, organizationId: string): Promise<DocumentJobResponse | null>;
  listJobsByDocument(documentId: string, organizationId: string): Promise<DocumentJobResponse[]>;
  listJobsByAssessment(assessmentId: string, organizationId: string): Promise<DocumentJobResponse[]>;
  updateJob(job: DocumentJobResponse): Promise<void>;
  withOrganization(organizationId: string): TenantScopedDocumentJobRepository;
};

export interface TenantScopedDocumentChunkRepository {
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  listChunks(documentId: string, limit: number, cursor?: string): Promise<DocumentChunk[]>;
}

export type DocumentChunkRepository = {
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  listChunks(documentId: string, organizationId: string, limit: number, cursor?: string): Promise<DocumentChunk[]>;
  withOrganization(organizationId: string): TenantScopedDocumentChunkRepository;
};

export type VectorReferenceRepository = {
  saveVectorReferences(references: VectorReferenceResponse[]): Promise<void>;
};

export type AuditSink = {
  record(event: string, metadata: Record<string, unknown>): Promise<void>;
};

export type DocumentChunk = {
  chunk_id: string;
  organization_id: string;
  assessment_id: string;
  document_id: string;
  document_version_id?: string;
  chunk_index: number;
  chunk_text: string;
  text_hash: string;
  token_count_estimate: number;
  page_number?: number;
  location_metadata: Record<string, unknown>;
  created_at: string;
};

export type DocumentTextExtractor = {
  supports(mimeType: string, extension: string): boolean;
  extract(input: { bytes: Uint8Array; mimeType: string; extension: string; filename: string }): Promise<ExtractedDocument>;
};

export type IngestionRepositories = {
  documents: DocumentRecordRepository;
  jobs: DocumentJobRepository;
  chunks: DocumentChunkRepository;
  vectorReferences: VectorReferenceRepository;
  audit: AuditSink;
};

export type DocumentIngestionServiceDependencies = {
  storage: StorageAdapter;
  queue: QueueAdapter;
  repositories: IngestionRepositories;
  bucketName: string;
  storageProvider: string;
  vectorIndexName: string;
  extractors: DocumentTextExtractor[];
  chunking: ChunkingConfig;
  malwareScanner?: MalwareScannerAdapter | undefined;
};


