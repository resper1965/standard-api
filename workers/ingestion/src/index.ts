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
      message: "Worker reservado para ingestão, extração, chunking e vetorização."
    });
  },

  async queue(batch: MessageBatch<DocumentIngestionJobMessage>, env: Env): Promise<void> {
    const deps = createInMemoryDocumentIngestionDependencies({
      storage: new R2StorageAdapter(env.AEGIS_DOCUMENTS_BUCKET)
    });

    for (const message of batch.messages) {
      const parsed = DocumentIngestionJobMessageSchema.safeParse(message.body);
      if (!parsed.success) {
        message.ack();
        continue;
      }

      await processDocumentIngestionJob(parsed.data, deps);
      message.ack();
    }
  }
};
