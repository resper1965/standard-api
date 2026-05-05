/**
 * @module aegis-ingestion
 * @description Cloudflare Worker for document ingestion pipeline.
 * Handles: document extraction, chunking, KB entry creation.
 * Consumes from aegis-document-ingestion queue.
 */
import {
  createInMemoryDocumentIngestionDependencies,
  processDocumentIngestionJob,
  type StorageAdapter,
  type StoredObject
} from "@aegis/document-ingestion";
import { DocumentIngestionJobMessageSchema, type DocumentIngestionJobMessage } from "@aegis/schemas";

export interface Env {
  AEGIS_DOCUMENTS_BUCKET: R2Bucket;
  AEGIS_KB_INDEX: VectorizeIndex;
  DATABASE_URL?: string;
  AEGIS_ENV?: string;
}

class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async putObject(object: StoredObject): Promise<void> {
    await this.bucket.put(object.key, object.bytes, {
      httpMetadata: { contentType: object.contentType },
      customMetadata: object.metadata
    });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    const bytes = new Uint8Array(await object.arrayBuffer());
    return {
      key,
      bytes,
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
      contentHash: object.customMetadata?.content_hash ?? "",
      metadata: object.customMetadata ?? {}
    };
  }
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({
      service: "aegis-ingestion",
      version: "1.0.0",
      capabilities: ["document_extraction", "chunking", "kb_entry_creation"],
      status: "operational"
    });
  },

  async queue(batch: MessageBatch<DocumentIngestionJobMessage>, env: Env): Promise<void> {
    const deps = createInMemoryDocumentIngestionDependencies({
      storage: new R2StorageAdapter(env.AEGIS_DOCUMENTS_BUCKET),
      storageProvider: "cloudflare_r2",
      bucketName: "AEGIS_DOCUMENTS_BUCKET"
    });

    for (const message of batch.messages) {
      const parsed = DocumentIngestionJobMessageSchema.safeParse(message.body);
      if (!parsed.success) {
        console.warn(`[ingestion] Invalid message schema:`, parsed.error.issues.slice(0, 3));
        message.ack(); // Don't retry invalid messages
        continue;
      }

      try {
        await processDocumentIngestionJob(parsed.data, deps);
        console.log(`[ingestion] Processed document ${parsed.data.document_id} successfully`);
        message.ack();
      } catch (error) {
        console.error(`[ingestion] Failed to process document ${parsed.data.document_id}:`, error);
        message.retry();
      }
    }
  }
};
