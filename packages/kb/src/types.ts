import type { DocumentChunk, DocumentIngestionServiceDependencies } from "@standard/document-ingestion";
import type {
  KbEmbeddingJobMessage,
  KbEmbeddingJobResponse,
  KbIndexRequest,
  KbIndexResponse,
  KbSearchFilters,
  KbSearchRequest,
  KbSearchResponse,
  KbSearchResult,
  KbSearchType,
  KbVectorReferenceResponse,
  VectorStoreMetadata
} from "@standard/schemas";

export type {
  KbEmbeddingJobMessage,
  KbEmbeddingJobResponse,
  KbIndexRequest,
  KbIndexResponse,
  KbSearchFilters,
  KbSearchRequest,
  KbSearchResponse,
  KbSearchResult,
  KbSearchType,
  KbVectorReferenceResponse,
  VectorStoreMetadata
};

export type EmbeddingModelInfo = {
  provider: string;
  model: string;
  dimensions: number;
};

export type EmbeddingResult = {
  vector: number[];
  model: string;
  dimensions: number;
  usage?: Record<string, unknown>;
};

export type EmbeddingProvider = {
  embedText(text: string, options?: Record<string, unknown>): Promise<EmbeddingResult>;
  embedBatch(texts: string[], options?: Record<string, unknown>): Promise<EmbeddingResult[]>;
  getModelInfo(): EmbeddingModelInfo;
};

export type VectorRecord = {
  id: string;
  values: number[];
  metadata: VectorStoreMetadata;
};

export type VectorUpsertResult = {
  upserted: number;
  ids: string[];
};

export type VectorSearchResult = {
  id: string;
  score: number;
  metadata: VectorStoreMetadata;
};

export type VectorQueryOptions = {
  topK: number;
};

export type VectorIndexInfo = {
  provider: string;
  indexName: string;
  dimensions?: number;
};

export type VectorStore = {
  upsert(records: VectorRecord[]): Promise<VectorUpsertResult>;
  query(queryVector: number[], filters: Partial<VectorStoreMetadata>, options: VectorQueryOptions): Promise<VectorSearchResult[]>;
  delete(ids: string[], filters?: Partial<VectorStoreMetadata>): Promise<void>;
  getIndexInfo(): Promise<VectorIndexInfo>;
};

export type KbEmbeddingJobRepository = {
  saveJob(job: KbEmbeddingJobResponse): Promise<void>;
  updateJob(job: KbEmbeddingJobResponse): Promise<void>;
  getJob(jobId: string, organizationId: string): Promise<KbEmbeddingJobResponse | null>;
  listJobsByAssessment(assessmentId: string, organizationId: string): Promise<KbEmbeddingJobResponse[]>;
  listJobsByDocument(documentId: string, organizationId: string): Promise<KbEmbeddingJobResponse[]>;
  findQueuedJobForChunk(chunkId: string, organizationId: string): Promise<KbEmbeddingJobResponse | null>;
};

export type KbVectorReferenceRepository = {
  save(reference: KbVectorReferenceResponse): Promise<void>;
  update(reference: KbVectorReferenceResponse): Promise<void>;
  get(referenceId: string, organizationId: string): Promise<KbVectorReferenceResponse | null>;
  findByChunk(chunkId: string, organizationId: string): Promise<KbVectorReferenceResponse | null>;
  listByAssessment(assessmentId: string, organizationId: string): Promise<KbVectorReferenceResponse[]>;
  listByDocument(documentId: string, organizationId: string): Promise<KbVectorReferenceResponse[]>;
};

export type KbSearchLogRepository = {
  record(log: {
    id: string;
    organization_id: string;
    assessment_id: string;
    actor_id?: string;
    query_hash: string;
    search_type: KbSearchType;
    filters: Record<string, unknown>;
    result_count: number;
    trace_id: string;
    created_at: string;
  }): Promise<void>;
  list(): Promise<Array<Record<string, unknown>>>;
};

export type KbQueueAdapter = {
  enqueue(message: KbEmbeddingJobMessage): Promise<void>;
};

export type KbRepositories = {
  embeddingJobs: KbEmbeddingJobRepository;
  vectorReferences: KbVectorReferenceRepository;
  searchLogs: KbSearchLogRepository;
};

export type KbServiceDependencies = {
  documentIngestion: DocumentIngestionServiceDependencies;
  repositories: KbRepositories;
  embeddingProvider: EmbeddingProvider;
  vectorStore: VectorStore;
  queue: KbQueueAdapter;
  vectorIndexName: string;
  vectorProvider: string;
};

export type KbRequestContext = {
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  traceId: string;
  requestedBy?: string;
};

export type ChunkWithDocument = {
  chunk: DocumentChunk;
  document: Awaited<ReturnType<DocumentIngestionServiceDependencies["repositories"]["documents"]["getDocument"]>> & {};
};

