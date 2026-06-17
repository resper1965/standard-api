import type { StorageAdapter, StoredObject } from "./types";

/**
 * Minimal interface matching what we use from Cloudflare R2Bucket.
 * This avoids a hard dependency on @cloudflare/workers-types in packages consumed by non-worker packages.
 */
interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ): Promise<unknown>;
  get(key: string): Promise<{
    key: string;
    arrayBuffer(): Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  } | null>;
  delete(key: string): Promise<void>;
}

export class CloudflareR2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2BucketLike) {}

  async putObject(object: StoredObject): Promise<void> {
    // Uint8Array.buffer is ArrayBufferLike; slice() returns a proper ArrayBuffer
    const buffer = object.bytes.buffer.slice(
      object.bytes.byteOffset,
      object.bytes.byteOffset + object.bytes.byteLength
    ) as ArrayBuffer;
    await this.bucket.put(object.key, buffer, {
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
      contentHash: r2Object.customMetadata?.["contentHash"] ?? "",
      metadata: r2Object.customMetadata ?? {}
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}

