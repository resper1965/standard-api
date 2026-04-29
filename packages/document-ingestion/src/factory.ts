import {
  InMemoryQueueAdapter,
  InMemoryStorageAdapter,
  createInMemoryIngestionRepositories
} from "./adapters";
import { defaultExtractors } from "./extractors";
import type { DocumentIngestionServiceDependencies } from "./types";

export const createInMemoryDocumentIngestionDependencies = (
  overrides: Partial<DocumentIngestionServiceDependencies> = {}
): DocumentIngestionServiceDependencies => {
  const repositories = createInMemoryIngestionRepositories();

  return {
    storage: new InMemoryStorageAdapter(),
    queue: new InMemoryQueueAdapter(),
    repositories,
    bucketName: "aegis-documents-dev",
    storageProvider: "mock_r2",
    vectorIndexName: "aegis-kb-dev",
    extractors: defaultExtractors,
    chunking: {
      max_tokens_estimate: 120,
      overlap_tokens_estimate: 0,
      strategy: "by_tokens_estimate",
      preserve_headings: true,
      preserve_pages: true
    },
    ...overrides
  };
};
