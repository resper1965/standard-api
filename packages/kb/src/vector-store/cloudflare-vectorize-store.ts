import type { VectorIndexInfo, VectorQueryOptions, VectorRecord, VectorSearchResult, VectorStore, VectorStoreMetadata, VectorUpsertResult } from "../types";

type VectorizeLikeIndex = {
  upsert(records: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>): Promise<unknown>;
  query(vector: number[], options: { topK: number; filter?: Record<string, unknown>; returnMetadata?: boolean }): Promise<{
    matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
  }>;
  deleteByIds?(ids: string[]): Promise<unknown>;
};

export class CloudflareVectorizeStore implements VectorStore {
  constructor(
    private readonly index: VectorizeLikeIndex,
    private readonly indexName: string
  ) {}

  async upsert(records: VectorRecord[]): Promise<VectorUpsertResult> {
    await this.index.upsert(records.map((record) => ({ id: record.id, values: record.values, metadata: record.metadata })));
    return { upserted: records.length, ids: records.map((record) => record.id) };
  }

  async query(queryVector: number[], filters: Partial<VectorStoreMetadata>, options: VectorQueryOptions): Promise<VectorSearchResult[]> {
    const response = await this.index.query(queryVector, { topK: options.topK, filter: filters, returnMetadata: true });
    return (response.matches ?? [])
      .map((match) => ({ id: match.id, score: match.score, metadata: match.metadata as VectorStoreMetadata }))
      .filter((match) => Object.entries(filters).every(([key, value]) => value === undefined || match.metadata[key as keyof VectorStoreMetadata] === value));
  }

  async delete(ids: string[]): Promise<void> {
    await this.index.deleteByIds?.(ids);
  }

  async getIndexInfo(): Promise<VectorIndexInfo> {
    return {
      provider: "cloudflare_vectorize",
      indexName: this.indexName
    };
  }
}
