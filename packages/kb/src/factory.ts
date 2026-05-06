import type { DocumentIngestionServiceDependencies } from "@standard/document-ingestion";
import { createInMemoryDocumentIngestionDependencies } from "@standard/document-ingestion";
import { DEFAULT_VECTOR_INDEX_NAME, DEFAULT_VECTOR_PROVIDER } from "./constants";
import { MockEmbeddingProvider } from "./embeddings/mock-embedding-provider";
import { InMemoryKbQueueAdapter } from "./queue";
import { createInMemoryKbRepositories } from "./repositories/kb.repositories";
import type { KbServiceDependencies, VectorStore, EmbeddingProvider, KbQueueAdapter } from "./types";
import { MockVectorStore } from "./vector-store/mock-vector-store";

export const createInMemoryKbDependencies = (
  documentIngestion: DocumentIngestionServiceDependencies = createInMemoryDocumentIngestionDependencies(),
  overrides: Partial<KbServiceDependencies> = {}
): KbServiceDependencies => ({
  documentIngestion,
  repositories: createInMemoryKbRepositories(),
  embeddingProvider: new MockEmbeddingProvider(),
  vectorStore: new MockVectorStore(DEFAULT_VECTOR_INDEX_NAME),
  queue: new InMemoryKbQueueAdapter(),
  vectorIndexName: DEFAULT_VECTOR_INDEX_NAME,
  vectorProvider: DEFAULT_VECTOR_PROVIDER,
  ...overrides
});

export const createDrizzleKbDependencies = (
  db: any,
  documentIngestion: DocumentIngestionServiceDependencies,
  vectorStore: VectorStore,
  embeddingProvider: EmbeddingProvider,
  queue: KbQueueAdapter,
  overrides: Partial<KbServiceDependencies> = {}
): KbServiceDependencies => {
  const { DrizzleKbEmbeddingJobRepository, DrizzleKbVectorReferenceRepository, DrizzleKbSearchLogRepository } = require("./drizzle-adapters");
  
  return {
    documentIngestion,
    repositories: {
      embeddingJobs: new DrizzleKbEmbeddingJobRepository(db),
      vectorReferences: new DrizzleKbVectorReferenceRepository(db),
      searchLogs: new DrizzleKbSearchLogRepository(db)
    },
    embeddingProvider,
    vectorStore,
    queue,
    vectorIndexName: overrides.vectorIndexName ?? DEFAULT_VECTOR_INDEX_NAME,
    vectorProvider: overrides.vectorProvider ?? DEFAULT_VECTOR_PROVIDER,
    ...overrides
  };
};

