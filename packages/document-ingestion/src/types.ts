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
  tenantId: string;
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
  putObject(object: StoredObject): Promise<void>;
  getObject(key: string): Promise<StoredObject | null>;
  deleteObject?(key: string): Promise<void>;
};

export type QueueAdapter = {
  enqueue(message: DocumentIngestionJobMessage): Promise<void>;
  enqueueKbEmbeddingJob(message: any): Promise<void>; // using any temporarily to avoid circular deps
};

export type DocumentRecordRepository = {
  saveDocument(document: DocumentResponse): Promise<void>;
  getDocument(documentId: string, tenantId: string): Promise<DocumentResponse | null>;
  listDocuments(assessmentId: string, tenantId: string): Promise<DocumentResponse[]>;
  updateDocument(document: DocumentResponse): Promise<void>;
};

export type DocumentJobRepository = {
  saveJob(job: DocumentJobResponse): Promise<void>;
  getJob(jobId: string, tenantId: string): Promise<DocumentJobResponse | null>;
  listJobsByDocument(documentId: string, tenantId: string): Promise<DocumentJobResponse[]>;
  listJobsByAssessment(assessmentId: string, tenantId: string): Promise<DocumentJobResponse[]>;
  updateJob(job: DocumentJobResponse): Promise<void>;
};

export type DocumentChunkRepository = {
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  listChunks(documentId: string, tenantId: string, limit: number, cursor?: string): Promise<DocumentChunk[]>;
};

export type VectorReferenceRepository = {
  saveVectorReferences(references: VectorReferenceResponse[]): Promise<void>;
};

export type AuditSink = {
  record(event: string, metadata: Record<string, unknown>): Promise<void>;
};

export type DocumentChunk = {
  chunk_id: string;
  tenant_id: string;
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
};

