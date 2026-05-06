import { createDrizzleKbDependencies, processKbEmbeddingJob, CloudflareVectorizeStore, CloudflareAiEmbeddingProvider, InMemoryKbQueueAdapter } from "@standard/kb";
import { createDrizzleDocumentIngestionDependencies, InMemoryQueueAdapter, InMemoryStorageAdapter } from "@standard/document-ingestion";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";
import { KbEmbeddingJobMessageSchema } from "@standard/schemas";
import type { Env } from "./index";

export const processKbEmbeddingQueueMessage = async (messageBody: unknown, env: Env): Promise<void> => {
  const parsed = KbEmbeddingJobMessageSchema.safeParse(messageBody);
  if (!parsed.success) {
    throw new Error("Invalid KB embedding queue message.");
  }

  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be defined for KB embedding.");

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema: schema as any });

  const documentIngestion = createDrizzleDocumentIngestionDependencies(db, {
    // We only need database repositories from ingestion mapping chunks/documents
    storage: new InMemoryStorageAdapter(), // Not used for embedding
    storageProvider: "cloudflare_r2",
    bucketName: "STANDARD_DOCUMENTS_BUCKET"
  });

  const vectorStore = new CloudflareVectorizeStore(env.STANDARD_KB_INDEX, "standard-kb-index");
  const embeddingProvider = new CloudflareAiEmbeddingProvider(env.AI);
  const kbQueue = new InMemoryKbQueueAdapter(); // Embeddings loop concludes here

  const deps = createDrizzleKbDependencies(
    db, 
    documentIngestion, 
    vectorStore, 
    embeddingProvider, 
    kbQueue, 
    {
      vectorIndexName: "standard-kb-index",
      vectorProvider: "cloudflare_vectorize"
    }
  );

  await processKbEmbeddingJob(parsed.data, deps);
};

