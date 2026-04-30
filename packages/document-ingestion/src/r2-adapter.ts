import type { StorageAdapter, StoredObject } from "./types";

export class CloudflareR2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async putObject(object: StoredObject): Promise<void> {
    await this.bucket.put(object.key, object.bytes.buffer, {
      httpMetadata: { contentType: object.contentType },
      customMetadata: {
        contentHash: object.contentHash,
        ...object.metadata
      }
    });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const r2Object = await this.bucket.get(key);
    if (!r2Object) return null;

    const arrayBuffer = await r2Object.arrayBuffer();
    return {
      key: r2Object.key,
      bytes: new Uint8Array(arrayBuffer),
      contentType: r2Object.httpMetadata?.contentType ?? "application/octet-stream",
      contentHash: r2Object.customMetadata?.contentHash ?? "",
      metadata: r2Object.customMetadata ?? {}
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
