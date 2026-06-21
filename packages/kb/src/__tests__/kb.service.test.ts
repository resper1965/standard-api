/**
 * @standard/kb — Comprehensive Unit Tests
 *
 * Covers: semantic search, embedding generation, document chunk storage/retrieval,
 * tenant isolation, indexing service, consumer processing, reprocessing,
 * and edge cases.
 *
 * Uses synthetic test data only — no real client data (AGENTS.md §7).
 * Every test carries organization_id and assessment_id (AGENTS.md §7, §17).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @standard/schemas to avoid the broken DB barrel (strmOperatorEnum issue).
// Only re-export the safe sub-modules that KB actually needs at runtime.
vi.mock("@standard/schemas", async () => {
  const kb = await vi.importActual<Record<string, unknown>>(
    "../../../../packages/schemas/src/kb.ts",
  );
  const common = await vi.importActual<Record<string, unknown>>(
    "../../../../packages/schemas/src/common.ts",
  );
  const documents = await vi.importActual<Record<string, unknown>>(
    "../../../../packages/schemas/src/documents.ts",
  );
  return { ...common, ...kb, ...documents };
});

import {
  createInMemoryKbDependencies,
  KbIndexingService,
  KbSearchService,
  KbReferenceService,
  KbReprocessService,
  MockEmbeddingProvider,
  MockVectorStore,
  CloudflareAiEmbeddingProvider,
  CloudflareAiRerankerProvider,
  CloudflareVectorizeStore,
  InMemoryKbQueueAdapter,
  createInMemoryKbRepositories,
  InMemoryKbEmbeddingJobRepository,
  InMemoryKbVectorReferenceRepository,
  InMemoryKbSearchLogRepository,
  processKbEmbeddingJob,
  CANDIDATE_EVIDENCE_WARNING,
  DEFAULT_TOP_K,
  MAX_TOP_K,
  DEFAULT_MOCK_EMBEDDING_DIMENSIONS,
  DEFAULT_MOCK_EMBEDDING_MODEL,
} from "../index";
import { createInMemoryDocumentIngestionDependencies } from "@standard/document-ingestion";
import type {
  KbServiceDependencies,
  KbRequestContext,
  VectorStoreMetadata,
  EmbeddingProvider,
  RerankerProvider,
} from "../types";

// ────────────────────────────────────────────────────────────────────────
// Synthetic Fixtures (no real data)
// ────────────────────────────────────────────────────────────────────────

const ORG_A = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbb0000-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ASSESS_A = "cccc0000-cccc-4ccc-8ccc-cccccccccccc";
const ASSESS_B = "dddd0000-dddd-4ddd-8ddd-dddddddddddd";
const DOC_A = "eeee0000-eeee-4eee-8eee-eeeeeeeeeeee";
const DOC_B = "ffff0000-ffff-4fff-8fff-ffffffffffff";
const CHUNK_A1 = "11110000-1111-4111-8111-111111111111";
const CHUNK_A2 = "22220000-2222-4222-8222-222222222222";
const CHUNK_B1 = "33330000-3333-4333-8333-333333333333";
const ACTOR_ID = "44440000-4444-4444-8444-444444444444";
const TRACE_ID = "trace-synth-001";

const ctxA: KbRequestContext = {
  organizationId: ORG_A,
  assessmentId: ASSESS_A,
  actorId: ACTOR_ID,
  traceId: TRACE_ID,
};

const ctxB: KbRequestContext = {
  organizationId: ORG_B,
  assessmentId: ASSESS_B,
  traceId: "trace-synth-002",
};

/** Seed document-ingestion dependencies with synthetic docs and chunks. */
async function seedDocIngestion(
  docIngestion: ReturnType<typeof createInMemoryDocumentIngestionDependencies>,
  options?: { orgId?: string; assessmentId?: string; docId?: string; chunks?: Array<{ id: string; text: string; page?: number }> },
) {
  const orgId = options?.orgId ?? ORG_A;
  const assessmentId = options?.assessmentId ?? ASSESS_A;
  const docId = options?.docId ?? DOC_A;
  const chunks = options?.chunks ?? [{ id: CHUNK_A1, text: "Synthetic access control policy for evidence." }];

  await docIngestion.repositories.documents.saveDocument({
    document_id: docId,
    organization_id: orgId,
    assessment_id: assessmentId,
    original_filename: "synthetic-policy.txt",
    normalized_filename: "synthetic-policy.txt",
    storage_provider: "mock_r2",
    storage_bucket: "bucket",
    storage_key: `${orgId}/${docId}`,
    content_hash: `hash-${docId}`,
    mime_type: "text/plain",
    file_size: 256,
    uploaded_by: ACTOR_ID,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    classification: "internal",
    document_type: "policy",
    language: "en",
    status: "chunked",
    scan_status: "clean",
    malware_signature: null,
    scanned_at: null,
    trace_id: TRACE_ID,
  });

  await docIngestion.repositories.chunks.saveChunks(
    chunks.map((c, i) => ({
      chunk_id: c.id,
      organization_id: orgId,
      assessment_id: assessmentId,
      document_id: docId,
      chunk_index: i,
      chunk_text: c.text,
      text_hash: `text-hash-${c.id}`,
      token_count_estimate: Math.ceil(c.text.length / 4),
      ...(c.page ? { page_number: c.page } : {}),
      location_metadata: { document_type: "policy" },
      created_at: "2026-01-01T00:00:00.000Z",
    })),
  );
}

/** Fully index a fixture: create deps, seed data, index + consumer-process all chunks. */
async function createIndexedFixture(
  seedOpts?: Parameters<typeof seedDocIngestion>[1],
) {
  const docIngestion = createInMemoryDocumentIngestionDependencies();
  await seedDocIngestion(docIngestion, seedOpts);
  const deps = createInMemoryKbDependencies(docIngestion);

  const orgId = seedOpts?.orgId ?? ORG_A;
  const assessmentId = seedOpts?.assessmentId ?? ASSESS_A;

  const indexing = new KbIndexingService(deps);
  const idxResult = await indexing.indexAssessment({
    organizationId: orgId,
    assessmentId,
    actorId: ACTOR_ID,
    traceId: TRACE_ID,
  });

  // Process all queued jobs through consumer
  for (let i = 0; i < idxResult.queued_job_ids.length; i++) {
    const jobId = idxResult.queued_job_ids[i]!;
    const refId = idxResult.vector_reference_ids[i]!;
    const job = await deps.repositories.embeddingJobs.getJob(jobId, orgId);
    if (!job) continue;
    await processKbEmbeddingJob(
      {
        organization_id: orgId,
        assessment_id: assessmentId,
        document_id: seedOpts?.docId ?? DOC_A,
        chunk_id: (seedOpts?.chunks?.[i]?.id) ?? CHUNK_A1,
        vector_reference_id: refId,
        job_id: jobId,
        embedding_model: job.embedding_model,
        vector_index_name: job.vector_index_name,
        trace_id: TRACE_ID,
        requested_by: ACTOR_ID,
        created_at: job.queued_at,
      },
      deps,
    );
  }

  return { deps, idxResult };
}

// ────────────────────────────────────────────────────────────────────────
// 1. MockEmbeddingProvider
// ────────────────────────────────────────────────────────────────────────
describe("MockEmbeddingProvider", () => {
  it("returns vector with correct dimensions (default)", async () => {
    const provider = new MockEmbeddingProvider();
    const result = await provider.embedText("synthetic test input");
    expect(result.dimensions).toBe(DEFAULT_MOCK_EMBEDDING_DIMENSIONS);
    expect(result.vector).toHaveLength(DEFAULT_MOCK_EMBEDDING_DIMENSIONS);
    expect(result.model).toBe(DEFAULT_MOCK_EMBEDDING_MODEL);
  });

  it("returns vector with custom dimensions", async () => {
    const provider = new MockEmbeddingProvider("custom-model", 32);
    const result = await provider.embedText("another synthetic input");
    expect(result.dimensions).toBe(32);
    expect(result.vector).toHaveLength(32);
    expect(result.model).toBe("custom-model");
  });

  it("embedBatch returns one result per input text", async () => {
    const provider = new MockEmbeddingProvider();
    const results = await provider.embedBatch(["text-a", "text-b", "text-c"]);
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.vector).toHaveLength(DEFAULT_MOCK_EMBEDDING_DIMENSIONS);
    }
  });

  it("produces normalized vectors (unit magnitude ≈ 1)", async () => {
    const provider = new MockEmbeddingProvider("mock", 8);
    const { vector } = await provider.embedText("normalize test");
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 3);
  });

  it("different texts produce different vectors", async () => {
    const provider = new MockEmbeddingProvider();
    const a = await provider.embedText("access control");
    const b = await provider.embedText("incident response");
    expect(a.vector).not.toEqual(b.vector);
  });

  it("same text produces identical vectors (deterministic)", async () => {
    const provider = new MockEmbeddingProvider();
    const a = await provider.embedText("determinism");
    const b = await provider.embedText("determinism");
    expect(a.vector).toEqual(b.vector);
  });

  it("getModelInfo returns correct metadata", () => {
    const provider = new MockEmbeddingProvider("test-model", 64);
    const info = provider.getModelInfo();
    expect(info.provider).toBe("mock");
    expect(info.model).toBe("test-model");
    expect(info.dimensions).toBe(64);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 2. CloudflareAiEmbeddingProvider
// ────────────────────────────────────────────────────────────────────────
describe("CloudflareAiEmbeddingProvider", () => {
  it("embedText delegates to AI binding and returns embedding", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ data: [Array.from({ length: 768 }, (_, i) => i * 0.001)] }),
    };
    const provider = new CloudflareAiEmbeddingProvider(mockAi as any);
    const result = await provider.embedText("synthetic input");

    expect(mockAi.run).toHaveBeenCalledWith("@cf/baai/bge-base-en-v1.5", { text: ["synthetic input"] });
    expect(result.vector).toHaveLength(768);
    expect(result.model).toBe("@cf/baai/bge-base-en-v1.5");
  });

  it("embedText throws on empty vector from AI", async () => {
    const mockAi = { run: vi.fn().mockResolvedValue({ data: [[]] }) };
    const provider = new CloudflareAiEmbeddingProvider(mockAi as any);
    await expect(provider.embedText("empty")).rejects.toThrow("empty embedding vector");
  });

  it("embedBatch processes multiple texts in batches", async () => {
    const mockAi = {
      run: vi.fn().mockImplementation((_model: string, input: { text: string[] }) =>
        Promise.resolve({ data: input.text.map(() => Array.from({ length: 768 }, () => 0.5)) }),
      ),
    };
    const provider = new CloudflareAiEmbeddingProvider(mockAi as any);
    const texts = Array.from({ length: 3 }, (_, i) => `text-${i}`);
    const results = await provider.embedBatch(texts);

    expect(results).toHaveLength(3);
    expect(mockAi.run).toHaveBeenCalledTimes(1); // < MAX_BATCH_SIZE (100)
  });

  it("embedBatch throws on batch size mismatch", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ data: [[0.1]] }),
    };
    const provider = new CloudflareAiEmbeddingProvider(mockAi as any);
    await expect(provider.embedBatch(["a", "b"])).rejects.toThrow("batch mismatch");
  });

  it("getModelInfo returns cloudflare metadata", () => {
    const mockAi = { run: vi.fn() };
    const provider = new CloudflareAiEmbeddingProvider(mockAi as any);
    const info = provider.getModelInfo();
    expect(info.provider).toBe("cloudflare_workers_ai");
    expect(info.model).toBe("@cf/baai/bge-base-en-v1.5");
    expect(info.dimensions).toBe(768);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 3. MockVectorStore — upsert, query, delete, tenant filter
// ────────────────────────────────────────────────────────────────────────
describe("MockVectorStore", () => {
  let store: InstanceType<typeof MockVectorStore>;
  const provider = new MockEmbeddingProvider("mock", 8);

  beforeEach(() => {
    store = new MockVectorStore("test-index");
  });

  const makeMetadata = (overrides: Partial<VectorStoreMetadata> = {}): VectorStoreMetadata => ({
    organization_id: ORG_A,
    assessment_id: ASSESS_A,
    document_id: DOC_A,
    chunk_id: CHUNK_A1,
    content_hash: "hash-synth",
    text_hash: "text-hash-synth",
    document_type: "policy",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("upsert returns count and ids", async () => {
    const emb = await provider.embedText("test content");
    const result = await store.upsert([{ id: "v1", values: emb.vector, metadata: makeMetadata() }]);
    expect(result.upserted).toBe(1);
    expect(result.ids).toEqual(["v1"]);
  });

  it("query returns results filtered by organization_id", async () => {
    const emb = await provider.embedText("access control");
    await store.upsert([
      { id: "v-org-a", values: emb.vector, metadata: makeMetadata({ organization_id: ORG_A }) },
      { id: "v-org-b", values: emb.vector, metadata: makeMetadata({ organization_id: ORG_B }) },
    ]);

    const resultsA = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 10 });
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0]!.id).toBe("v-org-a");

    const resultsB = await store.query(emb.vector, { organization_id: ORG_B }, { topK: 10 });
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0]!.id).toBe("v-org-b");
  });

  it("query respects topK limit", async () => {
    const emb = await provider.embedText("synthetic");
    for (let i = 0; i < 10; i++) {
      await store.upsert([{ id: `v-${i}`, values: emb.vector, metadata: makeMetadata({ chunk_id: `chunk-${i}` }) }]);
    }

    const results = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 3 });
    expect(results).toHaveLength(3);
  });

  it("query returns results sorted by cosine similarity descending", async () => {
    const queryEmb = await provider.embedText("access control");
    const closeEmb = await provider.embedText("access control policy"); // similar
    const farEmb = await provider.embedText("weather forecast tomorrow"); // dissimilar

    await store.upsert([
      { id: "far", values: farEmb.vector, metadata: makeMetadata({ chunk_id: "far-chunk" }) },
      { id: "close", values: closeEmb.vector, metadata: makeMetadata({ chunk_id: "close-chunk" }) },
    ]);

    const results = await store.query(queryEmb.vector, { organization_id: ORG_A }, { topK: 5 });
    expect(results).toHaveLength(2);
    // Close should score higher
    expect(results[0]!.id).toBe("close");
    expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
  });

  it("delete removes records matching ids and filters", async () => {
    const emb = await provider.embedText("delete test");
    await store.upsert([
      { id: "keep", values: emb.vector, metadata: makeMetadata({ organization_id: ORG_A }) },
      { id: "remove", values: emb.vector, metadata: makeMetadata({ organization_id: ORG_A }) },
    ]);

    await store.delete(["remove"], { organization_id: ORG_A });
    const results = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 10 });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("keep");
  });

  it("delete with wrong org filter does not remove records", async () => {
    const emb = await provider.embedText("no-delete");
    await store.upsert([{ id: "safe", values: emb.vector, metadata: makeMetadata({ organization_id: ORG_A }) }]);

    await store.delete(["safe"], { organization_id: ORG_B });
    const results = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 10 });
    expect(results).toHaveLength(1);
  });

  it("getIndexInfo returns provider and name", async () => {
    const info = await store.getIndexInfo();
    expect(info.provider).toBe("mock_vector_store");
    expect(info.indexName).toBe("test-index");
  });

  it("query with empty store returns empty array", async () => {
    const emb = await provider.embedText("nothing");
    const results = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 5 });
    expect(results).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 4. CloudflareVectorizeStore
// ────────────────────────────────────────────────────────────────────────
describe("CloudflareVectorizeStore", () => {
  it("upsert delegates to Vectorize index and returns result", async () => {
    const mockIndex = { upsert: vi.fn().mockResolvedValue({}), query: vi.fn(), deleteByIds: vi.fn() };
    const store = new CloudflareVectorizeStore(mockIndex, "prod-index");

    const result = await store.upsert([
      { id: "v1", values: [0.1, 0.2], metadata: { organization_id: ORG_A, assessment_id: ASSESS_A, document_id: DOC_A, chunk_id: CHUNK_A1, content_hash: "h", text_hash: "th", document_type: "policy", created_at: "2026-01-01" } },
    ]);

    expect(mockIndex.upsert).toHaveBeenCalledTimes(1);
    expect(result.upserted).toBe(1);
    expect(result.ids).toEqual(["v1"]);
  });

  it("query calls Vectorize with returnMetadata and applies tenant filter", async () => {
    const mockIndex = {
      upsert: vi.fn(),
      query: vi.fn().mockResolvedValue({
        matches: [
          { id: "m1", score: 0.95, metadata: { organization_id: ORG_A, assessment_id: ASSESS_A, document_id: DOC_A, chunk_id: CHUNK_A1, content_hash: "h", text_hash: "th", document_type: "policy", created_at: "2026-01-01" } },
          { id: "m2", score: 0.6, metadata: { organization_id: ORG_B, assessment_id: ASSESS_B, document_id: DOC_B, chunk_id: CHUNK_B1, content_hash: "h2", text_hash: "th2", document_type: "report", created_at: "2026-01-01" } },
        ],
      }),
    };
    const store = new CloudflareVectorizeStore(mockIndex, "prod-index");
    const results = await store.query([0.1], { organization_id: ORG_A }, { topK: 5 });

    expect(results).toHaveLength(1);
    expect(results[0]!.metadata.organization_id).toBe(ORG_A);
  });

  it("query returns empty when Vectorize returns no matches", async () => {
    const mockIndex = { upsert: vi.fn(), query: vi.fn().mockResolvedValue({ matches: undefined }) };
    const store = new CloudflareVectorizeStore(mockIndex, "prod-index");
    const results = await store.query([0.1], { organization_id: ORG_A }, { topK: 5 });
    expect(results).toEqual([]);
  });

  it("delete calls deleteByIds when available", async () => {
    const mockIndex = { upsert: vi.fn(), query: vi.fn(), deleteByIds: vi.fn().mockResolvedValue({}) };
    const store = new CloudflareVectorizeStore(mockIndex, "idx");
    await store.delete(["v1", "v2"]);
    expect(mockIndex.deleteByIds).toHaveBeenCalledWith(["v1", "v2"]);
  });

  it("delete does not throw when deleteByIds is missing", async () => {
    const mockIndex = { upsert: vi.fn(), query: vi.fn() };
    const store = new CloudflareVectorizeStore(mockIndex as any, "idx");
    await expect(store.delete(["v1"])).resolves.toBeUndefined();
  });

  it("getIndexInfo returns cloudflare_vectorize provider", async () => {
    const mockIndex = { upsert: vi.fn(), query: vi.fn() };
    const store = new CloudflareVectorizeStore(mockIndex as any, "my-index");
    const info = await store.getIndexInfo();
    expect(info.provider).toBe("cloudflare_vectorize");
    expect(info.indexName).toBe("my-index");
  });
});

// ────────────────────────────────────────────────────────────────────────
// 5. CloudflareAiRerankerProvider
// ────────────────────────────────────────────────────────────────────────
describe("CloudflareAiRerankerProvider", () => {
  it("returns empty array for empty documents", async () => {
    const mockAi = { run: vi.fn() };
    const reranker = new CloudflareAiRerankerProvider(mockAi as any);
    const result = await reranker.rerank("query", []);
    expect(result).toEqual([]);
    expect(mockAi.run).not.toHaveBeenCalled();
  });

  it("delegates to AI binding with correct model", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue([{ index: 0, score: 0.9 }, { index: 1, score: 0.5 }]),
    };
    const reranker = new CloudflareAiRerankerProvider(mockAi as any);
    const result = await reranker.rerank("auth", ["docA", "docB"]);

    expect(mockAi.run).toHaveBeenCalledWith("@cf/baai/bge-reranker-base", { query: "auth", documents: ["docA", "docB"] });
    expect(result).toHaveLength(2);
    expect(result[0]!.score).toBe(0.9);
  });

  it("falls back to original order on AI error", async () => {
    const mockAi = { run: vi.fn().mockRejectedValue(new Error("AI Gateway timeout")) };
    const reranker = new CloudflareAiRerankerProvider(mockAi as any);
    const result = await reranker.rerank("query", ["a", "b", "c"]);

    expect(result).toHaveLength(3);
    expect(result[0]!.index).toBe(0);
    expect(result[0]!.score).toBe(0);
    expect(result[2]!.index).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 6. In-Memory Repositories
// ────────────────────────────────────────────────────────────────────────
describe("InMemoryKbRepositories", () => {
  describe("EmbeddingJobRepository", () => {
    let repo: InstanceType<typeof InMemoryKbEmbeddingJobRepository>;

    beforeEach(() => {
      repo = new InMemoryKbEmbeddingJobRepository();
    });

    const makeJob = (overrides: Record<string, unknown> = {}) => ({
      job_id: crypto.randomUUID(),
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_id: CHUNK_A1,
      vector_reference_id: crypto.randomUUID(),
      job_type: "embed_chunk" as const,
      status: "queued" as const,
      attempt_count: 0,
      queued_at: "2026-01-01T00:00:00.000Z",
      trace_id: TRACE_ID,
      embedding_model: "mock",
      vector_index_name: "standard-kb-dev",
      metadata: {},
      ...overrides,
    });

    it("saveJob + getJob round-trip with tenant scope", async () => {
      const job = makeJob();
      await repo.saveJob(job);

      const retrieved = await repo.getJob(job.job_id, ORG_A);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.job_id).toBe(job.job_id);
    });

    it("getJob returns null for wrong organization_id", async () => {
      const job = makeJob();
      await repo.saveJob(job);
      const result = await repo.getJob(job.job_id, ORG_B);
      expect(result).toBeNull();
    });

    it("listJobsByAssessment filters by assessment + org", async () => {
      await repo.saveJob(makeJob({ assessment_id: ASSESS_A }));
      await repo.saveJob(makeJob({ assessment_id: ASSESS_B }));

      const results = await repo.listJobsByAssessment(ASSESS_A, ORG_A);
      expect(results).toHaveLength(1);
      expect(results[0]!.assessment_id).toBe(ASSESS_A);
    });

    it("listJobsByDocument filters by document + org", async () => {
      await repo.saveJob(makeJob({ document_id: DOC_A }));
      await repo.saveJob(makeJob({ document_id: DOC_B }));

      const results = await repo.listJobsByDocument(DOC_A, ORG_A);
      expect(results).toHaveLength(1);
    });

    it("findQueuedJobForChunk returns only active-status jobs", async () => {
      const queued = makeJob({ chunk_id: CHUNK_A1, status: "queued" as const });
      const succeeded = makeJob({ chunk_id: CHUNK_A1, status: "succeeded" as const });
      await repo.saveJob(queued);
      await repo.saveJob(succeeded);

      const found = await repo.findQueuedJobForChunk(CHUNK_A1, ORG_A);
      expect(found).not.toBeNull();
      expect(found!.status).toBe("queued");
    });

    it("findQueuedJobForChunk returns null when none match", async () => {
      await repo.saveJob(makeJob({ chunk_id: CHUNK_A1, status: "succeeded" as const }));
      const found = await repo.findQueuedJobForChunk(CHUNK_A1, ORG_A);
      expect(found).toBeNull();
    });

    it("updateJob overwrites existing job", async () => {
      const job = makeJob();
      await repo.saveJob(job);
      await repo.updateJob({ ...job, status: "running" as const, attempt_count: 1 });

      const updated = await repo.getJob(job.job_id, ORG_A);
      expect(updated!.status).toBe("running");
      expect(updated!.attempt_count).toBe(1);
    });
  });

  describe("VectorReferenceRepository", () => {
    let repo: InstanceType<typeof InMemoryKbVectorReferenceRepository>;

    beforeEach(() => {
      repo = new InMemoryKbVectorReferenceRepository();
    });

    const makeRef = (overrides: Record<string, unknown> = {}) => ({
      vector_reference_id: crypto.randomUUID(),
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_id: CHUNK_A1,
      vector_provider: "mock",
      vector_index_name: "standard-kb-dev",
      vector_id: null,
      embedding_model: null,
      embedding_dimensions: null,
      embedding_status: "pending" as const,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...overrides,
    });

    it("save + get with tenant scope", async () => {
      const ref = makeRef();
      await repo.save(ref);
      const got = await repo.get(ref.vector_reference_id, ORG_A);
      expect(got).not.toBeNull();
      expect(got!.chunk_id).toBe(CHUNK_A1);
    });

    it("get returns null for wrong org", async () => {
      const ref = makeRef();
      await repo.save(ref);
      expect(await repo.get(ref.vector_reference_id, ORG_B)).toBeNull();
    });

    it("findByChunk scopes by org", async () => {
      await repo.save(makeRef({ chunk_id: CHUNK_A1, organization_id: ORG_A }));
      await repo.save(makeRef({ chunk_id: CHUNK_A1, organization_id: ORG_B }));

      const foundA = await repo.findByChunk(CHUNK_A1, ORG_A);
      expect(foundA).not.toBeNull();
      expect(foundA!.organization_id).toBe(ORG_A);
    });

    it("listByAssessment filters correctly", async () => {
      await repo.save(makeRef({ assessment_id: ASSESS_A }));
      await repo.save(makeRef({ assessment_id: ASSESS_B }));
      const results = await repo.listByAssessment(ASSESS_A, ORG_A);
      expect(results).toHaveLength(1);
    });

    it("listByDocument filters correctly", async () => {
      await repo.save(makeRef({ document_id: DOC_A }));
      await repo.save(makeRef({ document_id: DOC_B }));
      const results = await repo.listByDocument(DOC_A, ORG_A);
      expect(results).toHaveLength(1);
    });
  });

  describe("SearchLogRepository", () => {
    it("records and lists search logs", async () => {
      const repo = new InMemoryKbSearchLogRepository();
      await repo.record({
        id: crypto.randomUUID(),
        organization_id: ORG_A,
        assessment_id: ASSESS_A,
        query_hash: "abc123",
        search_type: "semantic",
        filters: {},
        result_count: 3,
        trace_id: TRACE_ID,
        created_at: "2026-01-01T00:00:00.000Z",
      });

      const logs = await repo.list();
      expect(logs).toHaveLength(1);
      expect(logs[0]!.organization_id).toBe(ORG_A);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────
// 7. InMemoryKbQueueAdapter
// ────────────────────────────────────────────────────────────────────────
describe("InMemoryKbQueueAdapter", () => {
  it("enqueue stores messages in order", async () => {
    const queue = new InMemoryKbQueueAdapter();
    const msg1 = { organization_id: ORG_A, assessment_id: ASSESS_A, document_id: DOC_A, chunk_id: CHUNK_A1, vector_reference_id: "ref1", job_id: "j1", embedding_model: "mock", vector_index_name: "idx", trace_id: TRACE_ID, created_at: "2026-01-01" };
    const msg2 = { ...msg1, chunk_id: CHUNK_A2, job_id: "j2" };

    await queue.enqueue(msg1);
    await queue.enqueue(msg2);

    expect(queue.messages).toHaveLength(2);
    expect(queue.messages[0]!.chunk_id).toBe(CHUNK_A1);
    expect(queue.messages[1]!.chunk_id).toBe(CHUNK_A2);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 8. KbReferenceService
// ────────────────────────────────────────────────────────────────────────
describe("KbReferenceService", () => {
  it("creates pending reference for new chunk", async () => {
    const deps = createInMemoryKbDependencies();
    const svc = new KbReferenceService(deps);
    const chunk = {
      chunk_id: CHUNK_A1,
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_index: 0,
      chunk_text: "synthetic",
      text_hash: "th",
      token_count_estimate: 2,
      location_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const ref = await svc.getOrCreatePendingReference(chunk, "2026-01-01T00:00:00.000Z");
    expect(ref.embedding_status).toBe("pending");
    expect(ref.organization_id).toBe(ORG_A);
    expect(ref.chunk_id).toBe(CHUNK_A1);
    expect(ref.vector_id).toBeNull();
  });

  it("returns existing reference without creating duplicate", async () => {
    const deps = createInMemoryKbDependencies();
    const svc = new KbReferenceService(deps);
    const chunk = {
      chunk_id: CHUNK_A1,
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_index: 0,
      chunk_text: "synthetic",
      text_hash: "th",
      token_count_estimate: 2,
      location_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const first = await svc.getOrCreatePendingReference(chunk, "2026-01-01T00:00:00.000Z");
    const second = await svc.getOrCreatePendingReference(chunk, "2026-02-01T00:00:00.000Z");
    expect(first.vector_reference_id).toBe(second.vector_reference_id);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 9. KbIndexingService
// ────────────────────────────────────────────────────────────────────────
describe("KbIndexingService", () => {
  it("queues embedding jobs for all chunks in assessment", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion, {
      chunks: [
        { id: CHUNK_A1, text: "Synthetic chunk one." },
        { id: CHUNK_A2, text: "Synthetic chunk two." },
      ],
    });
    const deps = createInMemoryKbDependencies(docIngestion);
    const svc = new KbIndexingService(deps);

    const result = await svc.indexAssessment(ctxA);
    expect(result.queued_job_ids).toHaveLength(2);
    expect(result.vector_reference_ids).toHaveLength(2);
    expect(result.assessment_id).toBe(ASSESS_A);
    expect(result.trace_id).toBe(TRACE_ID);
  });

  it("does not duplicate jobs on second indexAssessment call", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion);
    const deps = createInMemoryKbDependencies(docIngestion);
    const svc = new KbIndexingService(deps);

    const first = await svc.indexAssessment(ctxA);
    expect(first.queued_job_ids).toHaveLength(1);

    const second = await svc.indexAssessment(ctxA);
    expect(second.queued_job_ids).toHaveLength(0);
    expect(second.skipped_chunk_ids).toHaveLength(1);
  });

  it("force_reindex re-queues even if already embedded", async () => {
    const { deps } = await createIndexedFixture();
    const svc = new KbIndexingService(deps);

    const reindex = await svc.indexAssessment(ctxA, { force_reindex: true });
    expect(reindex.queued_job_ids).toHaveLength(1);
  });

  it("skips chunks belonging to different organization", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion);
    const deps = createInMemoryKbDependencies(docIngestion);
    const svc = new KbIndexingService(deps);

    // Try indexing with a different org → should skip
    const result = await svc.indexAssessment({
      organizationId: ORG_B,
      assessmentId: ASSESS_A,
      traceId: TRACE_ID,
    });
    // Document belongs to ORG_A, not ORG_B, so listing returns empty
    expect(result.queued_job_ids).toHaveLength(0);
  });

  it("indexes only a specific document when document_id is given", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion, { docId: DOC_A, chunks: [{ id: CHUNK_A1, text: "doc-a chunk" }] });
    await seedDocIngestion(docIngestion, { docId: DOC_B, chunks: [{ id: CHUNK_B1, text: "doc-b chunk" }] });
    const deps = createInMemoryKbDependencies(docIngestion);
    const svc = new KbIndexingService(deps);

    const result = await svc.indexAssessment(ctxA, { force_reindex: false, document_id: DOC_A });
    expect(result.queued_job_ids).toHaveLength(1);
  });

  it("enqueues message on queue adapter", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion);
    const deps = createInMemoryKbDependencies(docIngestion);
    const svc = new KbIndexingService(deps);

    await svc.indexAssessment(ctxA);
    const queue = deps.queue as InMemoryKbQueueAdapter;
    expect(queue.messages).toHaveLength(1);
    expect(queue.messages[0]!.organization_id).toBe(ORG_A);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 10. processKbEmbeddingJob (Consumer)
// ────────────────────────────────────────────────────────────────────────
describe("processKbEmbeddingJob", () => {
  it("embeds chunk, upserts vector, and updates reference to 'embedded'", async () => {
    const { deps, idxResult } = await createIndexedFixture();
    const ref = await deps.repositories.vectorReferences.get(idxResult.vector_reference_ids[0]!, ORG_A);
    expect(ref).not.toBeNull();
    expect(ref!.embedding_status).toBe("embedded");
    expect(ref!.vector_id).toBe(`kb_${CHUNK_A1}`);
    expect(ref!.embedding_model).toBe(DEFAULT_MOCK_EMBEDDING_MODEL);
  });

  it("marks job as succeeded after processing", async () => {
    const { deps, idxResult } = await createIndexedFixture();
    const job = await deps.repositories.embeddingJobs.getJob(idxResult.queued_job_ids[0]!, ORG_A);
    expect(job).not.toBeNull();
    expect(job!.status).toBe("succeeded");
  });

  it("fails gracefully when chunk is not found", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion);
    const deps = createInMemoryKbDependencies(docIngestion);
    const indexing = new KbIndexingService(deps);
    const idxResult = await indexing.indexAssessment(ctxA);

    const jobId = idxResult.queued_job_ids[0]!;
    const refId = idxResult.vector_reference_ids[0]!;
    const job = await deps.repositories.embeddingJobs.getJob(jobId, ORG_A);

    // Process with wrong chunk_id → should fail
    await processKbEmbeddingJob(
      {
        organization_id: ORG_A,
        assessment_id: ASSESS_A,
        document_id: DOC_A,
        chunk_id: "nonexistent-chunk-id",
        vector_reference_id: refId,
        job_id: jobId,
        embedding_model: job!.embedding_model,
        vector_index_name: job!.vector_index_name,
        trace_id: TRACE_ID,
        created_at: job!.queued_at,
      },
      deps,
    );

    const failedJob = await deps.repositories.embeddingJobs.getJob(jobId, ORG_A);
    expect(failedJob!.status).toBe("failed");
    expect(failedJob!.error_code).toBe("KB_EMBEDDING_FAILED");

    const failedRef = await deps.repositories.vectorReferences.get(refId, ORG_A);
    expect(failedRef!.embedding_status).toBe("failed");
  });

  it("fails on tenant mismatch between chunk and message", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion, { orgId: ORG_A });
    const deps = createInMemoryKbDependencies(docIngestion);
    const indexing = new KbIndexingService(deps);
    const idxResult = await indexing.indexAssessment(ctxA);

    const jobId = idxResult.queued_job_ids[0]!;
    const refId = idxResult.vector_reference_ids[0]!;
    const job = await deps.repositories.embeddingJobs.getJob(jobId, ORG_A);

    // Process with a different org → should fail on tenant mismatch
    // But the consumer checks message.organization_id vs chunk.organization_id
    // The job was created for ORG_A, but we send message claiming ORG_B
    // getJob with ORG_B would return null → processKbEmbeddingJob returns early
    const result = await processKbEmbeddingJob(
      {
        organization_id: ORG_B,
        assessment_id: ASSESS_A,
        document_id: DOC_A,
        chunk_id: CHUNK_A1,
        vector_reference_id: refId,
        job_id: jobId,
        embedding_model: job!.embedding_model,
        vector_index_name: job!.vector_index_name,
        trace_id: TRACE_ID,
        created_at: job!.queued_at,
      },
      deps,
    );

    // Should have returned early since job/reference are ORG_A but message is ORG_B
    // Job status should remain unchanged (queued) since getJob returns null for ORG_B
    const unchanged = await deps.repositories.embeddingJobs.getJob(jobId, ORG_A);
    // The consumer sets status to "running" before it can fail,
    // but since getJob(jobId, ORG_B) is null, it returns early without touching anything
    expect(unchanged!.status).toBe("queued");
  });

  it("silently returns when job does not exist", async () => {
    const deps = createInMemoryKbDependencies();
    // Should not throw
    await processKbEmbeddingJob(
      {
        organization_id: ORG_A,
        assessment_id: ASSESS_A,
        document_id: DOC_A,
        chunk_id: CHUNK_A1,
        vector_reference_id: "nonexistent",
        job_id: "nonexistent",
        embedding_model: "mock",
        vector_index_name: "idx",
        trace_id: TRACE_ID,
        created_at: "2026-01-01",
      },
      deps,
    );
    // No crash — early return
  });

  it("stores vector with correct metadata including organization_id", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion);
    const vectorStore = new MockVectorStore();
    const deps = createInMemoryKbDependencies(docIngestion, { vectorStore });

    const indexing = new KbIndexingService(deps);
    const idxResult = await indexing.indexAssessment(ctxA);
    const job = await deps.repositories.embeddingJobs.getJob(idxResult.queued_job_ids[0]!, ORG_A);

    await processKbEmbeddingJob(
      {
        organization_id: ORG_A,
        assessment_id: ASSESS_A,
        document_id: DOC_A,
        chunk_id: CHUNK_A1,
        vector_reference_id: idxResult.vector_reference_ids[0]!,
        job_id: job!.job_id,
        embedding_model: job!.embedding_model,
        vector_index_name: job!.vector_index_name,
        trace_id: TRACE_ID,
        requested_by: ACTOR_ID,
        created_at: job!.queued_at,
      },
      deps,
    );

    // Verify vector was stored with tenant metadata
    const emb = await new MockEmbeddingProvider().embedText("Synthetic access control policy for evidence.");
    const results = await vectorStore.query(emb.vector, { organization_id: ORG_A }, { topK: 10 });
    expect(results).toHaveLength(1);
    expect(results[0]!.metadata.organization_id).toBe(ORG_A);
    expect(results[0]!.metadata.assessment_id).toBe(ASSESS_A);
    expect(results[0]!.metadata.document_id).toBe(DOC_A);
    expect(results[0]!.metadata.chunk_id).toBe(CHUNK_A1);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 11. KbSearchService
// ────────────────────────────────────────────────────────────────────────
describe("KbSearchService", () => {
  it("semanticSearch returns candidate evidence with warning", async () => {
    const { deps } = await createIndexedFixture();
    const search = new KbSearchService(deps);

    const result = await search.semanticSearch(ctxA, {
      query: "access control",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    expect(result.candidate_evidence).toBe(true);
    expect(result.warning).toBe(CANDIDATE_EVIDENCE_WARNING);
    expect(result.assessment_id).toBe(ASSESS_A);
    expect(result.search_type).toBe("semantic");
    expect(result.trace_id).toBe(TRACE_ID);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it("search result contains expected fields", async () => {
    const { deps } = await createIndexedFixture();
    const search = new KbSearchService(deps);

    const result = await search.semanticSearch(ctxA, {
      query: "access control",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    const hit = result.data[0]!;
    expect(hit.organization_id).toBe(ORG_A);
    expect(hit.assessment_id).toBe(ASSESS_A);
    expect(hit.document_id).toBe(DOC_A);
    expect(hit.chunk_id).toBe(CHUNK_A1);
    expect(hit.candidate_evidence).toBe(true);
    expect(hit.retrieval_method).toBe("vector");
    expect(hit.document_type).toBe("policy");
    expect(hit.document_title).toBe("synthetic-policy.txt");
    expect(typeof hit.score).toBe("number");
    expect(typeof hit.snippet).toBe("string");
    expect(hit.snippet.length).toBeGreaterThan(0);
  });

  it("hybridSearch sets retrieval_method to hybrid", async () => {
    const { deps } = await createIndexedFixture();
    const search = new KbSearchService(deps);

    const result = await search.hybridSearch(ctxA, {
      query: "access control",
      search_type: "hybrid",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    expect(result.search_type).toBe("hybrid");
    if (result.data.length > 0) {
      expect(result.data[0]!.retrieval_method).toBe("hybrid");
    }
  });

  it("top_k is capped at MAX_TOP_K", async () => {
    const { deps } = await createIndexedFixture({
      chunks: Array.from({ length: 25 }, (_, i) => ({
        id: `chunk-${String(i).padStart(4, "0")}`,
        text: `Synthetic evidence number ${i} for testing top_k limit.`,
      })),
    });

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(ctxA, {
      query: "evidence",
      search_type: "semantic",
      filters: {},
      top_k: 100, // exceeds MAX_TOP_K
      include_context: false,
    });

    expect(result.data.length).toBeLessThanOrEqual(MAX_TOP_K);
  });

  it("filters by document_id", async () => {
    const docIngestion = createInMemoryDocumentIngestionDependencies();
    await seedDocIngestion(docIngestion, { docId: DOC_A, chunks: [{ id: CHUNK_A1, text: "Doc A content" }] });
    await seedDocIngestion(docIngestion, { docId: DOC_B, chunks: [{ id: CHUNK_B1, text: "Doc B content" }] });
    const deps = createInMemoryKbDependencies(docIngestion);

    // Index and process both
    const indexing = new KbIndexingService(deps);
    const idx = await indexing.indexAssessment(ctxA);
    for (let i = 0; i < idx.queued_job_ids.length; i++) {
      const job = await deps.repositories.embeddingJobs.getJob(idx.queued_job_ids[i]!, ORG_A);
      if (!job) continue;
      await processKbEmbeddingJob(
        {
          organization_id: ORG_A,
          assessment_id: ASSESS_A,
          document_id: i === 0 ? DOC_A : DOC_B,
          chunk_id: i === 0 ? CHUNK_A1 : CHUNK_B1,
          vector_reference_id: idx.vector_reference_ids[i]!,
          job_id: job.job_id,
          embedding_model: job.embedding_model,
          vector_index_name: job.vector_index_name,
          trace_id: TRACE_ID,
          created_at: job.queued_at,
        },
        deps,
      );
    }

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(ctxA, {
      query: "content",
      search_type: "semantic",
      filters: { document_id: DOC_A },
      top_k: 10,
      include_context: false,
    });

    for (const hit of result.data) {
      expect(hit.document_id).toBe(DOC_A);
    }
  });

  it("records search log with hashed query (no raw query text)", async () => {
    const { deps } = await createIndexedFixture();
    const search = new KbSearchService(deps);

    await search.semanticSearch(ctxA, {
      query: "confidential search query",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    const logs = await deps.repositories.searchLogs.list();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.organization_id).toBe(ORG_A);
    expect(logs[0]!.assessment_id).toBe(ASSESS_A);
    expect(typeof logs[0]!.query_hash).toBe("string");
    expect((logs[0]!.query_hash as string).length).toBeGreaterThan(0);
    // Ensure the raw query text is NOT stored in the log
    const serialized = JSON.stringify(logs[0]);
    expect(serialized).not.toContain("confidential search query");
  });

  it("search with reranker sets reranked flag on results", async () => {
    const { deps } = await createIndexedFixture();
    deps.rerankerProvider = {
      rerank: async (_query, documents) =>
        documents.map((_, i) => ({ index: i, score: 0.95 - i * 0.1 })),
    };

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(ctxA, {
      query: "access control",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    if (result.data.length > 0) {
      expect((result.data[0] as any).reranked).toBe(true);
    }
  });

  it("search gracefully falls back when reranker throws", async () => {
    const { deps } = await createIndexedFixture();
    deps.rerankerProvider = {
      rerank: async () => { throw new Error("Reranker crash"); },
    };

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(ctxA, {
      query: "access control",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    // Should still return results without crashing
    expect(result.candidate_evidence).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });

  it("getChunkContext returns chunk with neighbors", async () => {
    const { deps } = await createIndexedFixture({
      chunks: [
        { id: CHUNK_A1, text: "First chunk" },
        { id: CHUNK_A2, text: "Second chunk" },
      ],
    });

    const search = new KbSearchService(deps);
    const ctx = await search.getChunkContext(CHUNK_A1, ctxA);

    expect(ctx).not.toBeNull();
    expect(ctx!.chunk.chunk_id).toBe(CHUNK_A1);
    expect(ctx!.next?.chunk_id).toBe(CHUNK_A2);
    expect(ctx!.previous).toBeUndefined();
  });

  it("getChunkContext returns null for nonexistent chunk", async () => {
    const { deps } = await createIndexedFixture();
    const search = new KbSearchService(deps);
    const ctx = await search.getChunkContext("nonexistent", ctxA);
    expect(ctx).toBeNull();
  });

  it("search returns empty data when no vectors match", async () => {
    const deps = createInMemoryKbDependencies();
    const search = new KbSearchService(deps);

    const result = await search.semanticSearch(ctxA, {
      query: "nothing here",
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false,
    });

    expect(result.data).toEqual([]);
    expect(result.candidate_evidence).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 12. Tenant Isolation (organization_id scoping)
// ────────────────────────────────────────────────────────────────────────
describe("Tenant Isolation", () => {
  it("search returns zero results for a different organization_id", async () => {
    const { deps } = await createIndexedFixture({ orgId: ORG_A });

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(
      { organizationId: ORG_B, assessmentId: ASSESS_A, traceId: "trace-iso" },
      { query: "access control", search_type: "semantic", filters: {}, top_k: 5, include_context: false },
    );

    expect(result.data).toHaveLength(0);
  });

  it("search returns zero results for same org but different assessment", async () => {
    const { deps } = await createIndexedFixture({ orgId: ORG_A, assessmentId: ASSESS_A });

    const search = new KbSearchService(deps);
    const result = await search.semanticSearch(
      { organizationId: ORG_A, assessmentId: ASSESS_B, traceId: "trace-iso" },
      { query: "access control", search_type: "semantic", filters: {}, top_k: 5, include_context: false },
    );

    expect(result.data).toHaveLength(0);
  });

  it("vector store isolates by organization_id filter", async () => {
    const store = new MockVectorStore();
    const provider = new MockEmbeddingProvider("mock", 8);
    const emb = await provider.embedText("shared text");

    await store.upsert([
      { id: "org-a-vec", values: emb.vector, metadata: { organization_id: ORG_A, assessment_id: ASSESS_A, document_id: DOC_A, chunk_id: CHUNK_A1, content_hash: "h", text_hash: "th", document_type: "policy", created_at: "2026-01-01" } },
      { id: "org-b-vec", values: emb.vector, metadata: { organization_id: ORG_B, assessment_id: ASSESS_B, document_id: DOC_B, chunk_id: CHUNK_B1, content_hash: "h2", text_hash: "th2", document_type: "report", created_at: "2026-01-01" } },
    ]);

    const aResults = await store.query(emb.vector, { organization_id: ORG_A }, { topK: 10 });
    const bResults = await store.query(emb.vector, { organization_id: ORG_B }, { topK: 10 });

    expect(aResults).toHaveLength(1);
    expect(aResults[0]!.metadata.organization_id).toBe(ORG_A);
    expect(bResults).toHaveLength(1);
    expect(bResults[0]!.metadata.organization_id).toBe(ORG_B);
  });

  it("embedding job repository isolates by organization_id", async () => {
    const repo = new InMemoryKbEmbeddingJobRepository();
    const job = {
      job_id: crypto.randomUUID(),
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_id: CHUNK_A1,
      vector_reference_id: crypto.randomUUID(),
      job_type: "embed_chunk" as const,
      status: "queued" as const,
      attempt_count: 0,
      queued_at: "2026-01-01T00:00:00.000Z",
      trace_id: TRACE_ID,
      embedding_model: "mock",
      vector_index_name: "idx",
      metadata: {},
    };

    await repo.saveJob(job);
    expect(await repo.getJob(job.job_id, ORG_A)).not.toBeNull();
    expect(await repo.getJob(job.job_id, ORG_B)).toBeNull();
  });

  it("vector reference repository isolates by organization_id", async () => {
    const repo = new InMemoryKbVectorReferenceRepository();
    const ref = {
      vector_reference_id: crypto.randomUUID(),
      organization_id: ORG_A,
      assessment_id: ASSESS_A,
      document_id: DOC_A,
      chunk_id: CHUNK_A1,
      vector_provider: "mock",
      vector_index_name: "idx",
      vector_id: null,
      embedding_model: null,
      embedding_dimensions: null,
      embedding_status: "pending" as const,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    await repo.save(ref);
    expect(await repo.get(ref.vector_reference_id, ORG_A)).not.toBeNull();
    expect(await repo.get(ref.vector_reference_id, ORG_B)).toBeNull();
    expect(await repo.findByChunk(CHUNK_A1, ORG_A)).not.toBeNull();
    expect(await repo.findByChunk(CHUNK_A1, ORG_B)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────
// 13. KbReprocessService
// ────────────────────────────────────────────────────────────────────────
describe("KbReprocessService", () => {
  it("reindexDocument delegates to KbIndexingService with force_reindex=true", async () => {
    const { deps } = await createIndexedFixture();
    const svc = new KbReprocessService(deps);

    const result = await svc.reindexDocument(DOC_A, ctxA);
    expect(result.queued_job_ids).toHaveLength(1);
    expect(result.assessment_id).toBe(ASSESS_A);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 14. Factory
// ────────────────────────────────────────────────────────────────────────
describe("createInMemoryKbDependencies", () => {
  it("creates valid dependencies with defaults", () => {
    const deps = createInMemoryKbDependencies();
    expect(deps.embeddingProvider).toBeInstanceOf(MockEmbeddingProvider);
    expect(deps.vectorStore).toBeInstanceOf(MockVectorStore);
    expect(deps.queue).toBeInstanceOf(InMemoryKbQueueAdapter);
    expect(deps.repositories.embeddingJobs).toBeInstanceOf(InMemoryKbEmbeddingJobRepository);
    expect(deps.repositories.vectorReferences).toBeInstanceOf(InMemoryKbVectorReferenceRepository);
    expect(deps.repositories.searchLogs).toBeInstanceOf(InMemoryKbSearchLogRepository);
    expect(deps.vectorIndexName).toBe("standard-kb-dev");
    expect(deps.vectorProvider).toBe("cloudflare_vectorize");
  });

  it("accepts overrides", () => {
    const customStore = new MockVectorStore("custom");
    const deps = createInMemoryKbDependencies(undefined, { vectorStore: customStore });
    expect(deps.vectorStore).toBe(customStore);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 15. Constants
// ────────────────────────────────────────────────────────────────────────
describe("Constants", () => {
  it("exports expected values", () => {
    expect(DEFAULT_TOP_K).toBe(5);
    expect(MAX_TOP_K).toBe(20);
    expect(DEFAULT_MOCK_EMBEDDING_DIMENSIONS).toBe(16);
    expect(DEFAULT_MOCK_EMBEDDING_MODEL).toBe("mock-standard-embedding-v1");
    expect(CANDIDATE_EVIDENCE_WARNING).toContain("candidate evidence");
  });
});
