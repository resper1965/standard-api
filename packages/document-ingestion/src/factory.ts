import {
  InMemoryQueueAdapter,
  InMemoryStorageAdapter,
  createInMemoryIngestionRepositories,
  InMemoryAuditSink
} from "./adapters";
import { getDefaultExtractors } from "./extractors";
import { MockMalwareScannerAdapter, HeuristicMalwareScannerAdapter } from "./malware-scanner";
import type { DocumentIngestionServiceDependencies } from "./types";

export const createInMemoryDocumentIngestionDependencies = (
  config: Partial<DocumentIngestionServiceDependencies> = {},
  env?: Record<string, string>
): DocumentIngestionServiceDependencies => {
  return {
    storage: config.storage ?? new InMemoryStorageAdapter(),
    queue: config.queue ?? new InMemoryQueueAdapter(),
    repositories: config.repositories ?? createInMemoryIngestionRepositories(),
    extractors: config.extractors ?? getDefaultExtractors(env),
    chunking: config.chunking ?? {
      max_tokens_estimate: 120,
      overlap_tokens_estimate: 0,
      strategy: "by_tokens_estimate" as const,
      preserve_headings: true,
      preserve_pages: true
    },
    bucketName: config.bucketName ?? "standard-documents-dev",
    storageProvider: config.storageProvider ?? "mock_r2",
    vectorIndexName: config.vectorIndexName ?? "standard-kb-dev",
    malwareScanner: config.malwareScanner ?? new MockMalwareScannerAdapter(),
  };
};

export const createDrizzleDocumentIngestionDependencies = async (
  db: any,
  config: Partial<DocumentIngestionServiceDependencies> = {},
  env?: Record<string, string>
): Promise<DocumentIngestionServiceDependencies> => {
  const { DrizzleDocumentRepository, DrizzleDocumentJobRepository, DrizzleDocumentChunkRepository, DrizzleVectorReferenceRepository } = await import("./drizzle-adapters");
  
  const drizzleRepositories = {
    documents: new DrizzleDocumentRepository(db),
    jobs: new DrizzleDocumentJobRepository(db),
    chunks: new DrizzleDocumentChunkRepository(db),
    vectorReferences: new DrizzleVectorReferenceRepository(db),
    audit: config.repositories?.audit ?? new InMemoryAuditSink() // TODO implementation
  };

  return {
    storage: config.storage ?? new InMemoryStorageAdapter(),
    queue: config.queue ?? new InMemoryQueueAdapter(), // Overridden with Cloudflare queues
    repositories: config.repositories ?? drizzleRepositories,
    extractors: config.extractors ?? getDefaultExtractors(env),
    chunking: config.chunking ?? {
      max_tokens_estimate: 500,
      overlap_tokens_estimate: 50,
      strategy: "by_tokens_estimate" as const,
      preserve_headings: true,
      preserve_pages: true
    },
    bucketName: config.bucketName ?? "standard-documents-prod",
    storageProvider: config.storageProvider ?? "cloudflare_r2",
    vectorIndexName: config.vectorIndexName ?? "standard-kb-index",
    malwareScanner: config.malwareScanner ?? new HeuristicMalwareScannerAdapter(),
  };
};

