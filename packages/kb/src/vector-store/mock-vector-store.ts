import type { VectorIndexInfo, VectorQueryOptions, VectorRecord, VectorSearchResult, VectorStore, VectorUpsertResult, VectorStoreMetadata } from "../types";

const cosineSimilarity = (left: number[], right: number[]): number => {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    dot += l * r;
    leftMagnitude += l * l;
    rightMagnitude += r * r;
  }
  return dot / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
};

const matchesFilters = (metadata: VectorStoreMetadata, filters: Partial<VectorStoreMetadata>): boolean =>
  Object.entries(filters).every(([key, value]) => value === undefined || metadata[key as keyof VectorStoreMetadata] === value);

export class MockVectorStore implements VectorStore {
  private readonly records = new Map<string, VectorRecord>();

  constructor(private readonly indexName = "standard-kb-dev") {}

  async upsert(records: VectorRecord[]): Promise<VectorUpsertResult> {
    for (const record of records) {
      this.records.set(record.id, record);
    }
    return { upserted: records.length, ids: records.map((record) => record.id) };
  }

  async query(queryVector: number[], filters: Partial<VectorStoreMetadata>, options: VectorQueryOptions): Promise<VectorSearchResult[]> {
    return [...this.records.values()]
      .filter((record) => matchesFilters(record.metadata, filters))
      .map((record) => ({
        id: record.id,
        score: cosineSimilarity(queryVector, record.values),
        metadata: record.metadata
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK);
  }

  async delete(ids: string[], filters: Partial<VectorStoreMetadata> = {}): Promise<void> {
    for (const id of ids) {
      const record = this.records.get(id);
      if (record && matchesFilters(record.metadata, filters)) {
        this.records.delete(id);
      }
    }
  }

  async getIndexInfo(): Promise<VectorIndexInfo> {
    return {
      provider: "mock_vector_store",
      indexName: this.indexName
    };
  }
}


