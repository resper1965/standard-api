/**
 * @module compose-document-ingestion
 * @description Factory for Document Ingestion + KB dependency graphs.
 */
import {
  CloudflareR2StorageAdapter,
  getDefaultExtractors,
} from "@standard/document-ingestion";
import type { DocumentIngestionServiceDependencies } from "@standard/document-ingestion";
import {
  CloudflareVectorizeStore,
  CloudflareAiEmbeddingProvider,
  CloudflareAiRerankerProvider,
  MockEmbeddingProvider,
  MockVectorStore,
  DEFAULT_VECTOR_INDEX_NAME,
  DEFAULT_VECTOR_PROVIDER,
} from "@standard/kb";
import type { KbServiceDependencies } from "@standard/kb";
import { createDrizzleIngestionRepositories } from "./document-ingestion.repository";
import { createDrizzleKbRepositories } from "@standard/kb";
import type { Env } from "../types/env";
import type { DbClient } from "./db";

export const composeDrizzleDocumentIngestion = (
  db: DbClient,
  env?: Env,
): DocumentIngestionServiceDependencies => {
  const ingestionRepositories = createDrizzleIngestionRepositories(db);
  const storage = env?.STANDARD_DOCUMENTS_BUCKET
    ? new CloudflareR2StorageAdapter(env.STANDARD_DOCUMENTS_BUCKET)
    : undefined;

  return {
    storage: storage ?? {
      putObject: async () => {},
      getObject: async () => null,
    },
    queue: { enqueue: async () => {}, enqueueKbEmbeddingJob: async () => {} },
    repositories: ingestionRepositories,
    bucketName: "STANDARD_DOCUMENTS_BUCKET",
    storageProvider: storage ? "cloudflare_r2" : "memory",
    vectorIndexName: DEFAULT_VECTOR_INDEX_NAME,
    extractors: getDefaultExtractors(env as Record<string, string> | undefined),
    chunking: {
      max_tokens_estimate: 800,
      overlap_tokens_estimate: 80,
      strategy: "by_tokens_estimate",
      preserve_headings: true,
      preserve_pages: true,
    },
  };
};

export const composeDrizzleKb = (
  db: DbClient,
  documentIngestion: DocumentIngestionServiceDependencies,
  env?: Env,
): KbServiceDependencies => {
  const kbRepositories = createDrizzleKbRepositories(db);
  const embeddingProvider = env?.AI
    ? new CloudflareAiEmbeddingProvider(env.AI)
    : new MockEmbeddingProvider();
  const rerankerProvider = env?.AI
    ? new CloudflareAiRerankerProvider(env.AI)
    : undefined;
  const vectorStore = env?.STANDARD_KB_INDEX
    ? new CloudflareVectorizeStore(
        env.STANDARD_KB_INDEX,
        DEFAULT_VECTOR_INDEX_NAME,
      )
    : new MockVectorStore(DEFAULT_VECTOR_INDEX_NAME);

  return {
    documentIngestion,
    repositories: kbRepositories,
    embeddingProvider,
    rerankerProvider,
    vectorStore,
    queue: { enqueue: async () => {} },
    vectorIndexName: DEFAULT_VECTOR_INDEX_NAME,
    vectorProvider: DEFAULT_VECTOR_PROVIDER,
  };
};
