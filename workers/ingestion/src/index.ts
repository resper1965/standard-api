/**
 * @module standard-ingestion
 * @description Cloudflare Worker for document ingestion pipeline.
 * Handles: document extraction, chunking, KB entry creation.
 * Consumes from standard-document-ingestion queue.
 */
import {
  createInMemoryDocumentIngestionDependencies,
  processDocumentIngestionJob,
  HeuristicMalwareScannerAdapter,
  createDrizzleIngestionRepositories,
  type StorageAdapter,
  type StoredObject,
} from "@standard/document-ingestion";
import {
  DocumentIngestionJobMessageSchema,
  type DocumentIngestionJobMessage,
} from "@standard/schemas";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

export interface Env {
  STANDARD_DOCUMENTS_BUCKET: R2Bucket;
  STANDARD_KB_INDEX: VectorizeIndex;
  DATABASE_URL?: string;
  STANDARD_ENV?: string;
  AZURE_DOCUMENT_INTELLIGENCE_KEY?: string;
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?: string;
  OPENSOURCE_OCR_ENDPOINT?: string;
  STANDARD_KB_EMBEDDING_QUEUE: Queue<any>;
}

class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async putObject(object: StoredObject): Promise<void> {
    await this.bucket.put(object.key, object.bytes, {
      httpMetadata: { contentType: object.contentType },
      customMetadata: object.metadata,
    });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    const bytes = new Uint8Array(await object.arrayBuffer());
    return {
      key,
      bytes,
      contentType:
        object.httpMetadata?.contentType ?? "application/octet-stream",
      contentHash: object.customMetadata?.content_hash ?? "",
      metadata: object.customMetadata ?? {},
    };
  }
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({
      service: "standard-ingestion",
      version: "1.0.0",
      capabilities: ["document_extraction", "chunking", "kb_entry_creation"],
      status: "operational",
    });
  },

  async queue(
    batch: MessageBatch<DocumentIngestionJobMessage>,
    env: Env,
  ): Promise<void> {
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be defined");

    // Azure Document Intelligence envs read by Extractor Factory if present in process.env or passed in context
    const sql = neon(env.DATABASE_URL);
    const db = drizzle(sql, { schema: schema as any });

    const deps = createInMemoryDocumentIngestionDependencies(
      {
        storage: new R2StorageAdapter(env.STANDARD_DOCUMENTS_BUCKET),
        storageProvider: "cloudflare_r2",
        bucketName: "STANDARD_DOCUMENTS_BUCKET",
        malwareScanner: new HeuristicMalwareScannerAdapter(),
        repositories: createDrizzleIngestionRepositories(db),
        queue: {
          enqueue: async (_message: any) => {
            console.warn(
              "Enqueueing back to DocumentIngestion is not supported",
            );
          },
          enqueueKbEmbeddingJob: async (message: any) => {
            await env.STANDARD_KB_EMBEDDING_QUEUE.send(message);
          },
        },
      },
      {
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:
          env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || "",
        AZURE_DOCUMENT_INTELLIGENCE_KEY:
          env.AZURE_DOCUMENT_INTELLIGENCE_KEY || "",
        OPENSOURCE_OCR_ENDPOINT: env.OPENSOURCE_OCR_ENDPOINT || "",
      },
    );

    for (const message of batch.messages) {
      const parsed = DocumentIngestionJobMessageSchema.safeParse(message.body);
      if (!parsed.success) {
        console.warn(
          `[ingestion] Invalid message schema:`,
          parsed.error.issues.slice(0, 3),
        );
        message.ack(); // Don't retry invalid messages
        continue;
      }

      try {
        await processDocumentIngestionJob(parsed.data, deps);
        console.log(
          `[ingestion] Processed document ${parsed.data.document_id} successfully`,
        );
        message.ack();
      } catch (error) {
        console.error(
          `[ingestion] Failed to process document ${parsed.data.document_id}:`,
          error,
        );
        message.retry();
      }
    }
  },
};
