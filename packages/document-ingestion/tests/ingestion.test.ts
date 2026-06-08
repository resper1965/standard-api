import {
  DocumentIngestionService,
  PlainTextExtractor,
  AzurePdfExtractor,
  buildStorageKey,
  chunkExtractedDocument,
  createInMemoryDocumentIngestionDependencies,
  processDocumentIngestionJob,
  sanitizeFilename,
  sha256Hex,
  validateFile,
  type DocumentTextExtractor,
} from "../src";
import { expect, expectRejects, test } from "./test-kit";

const ids = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
  documentId: "55555555-5555-4555-8555-555555555555",
  jobId: "66666666-6666-4666-8666-666666666666",
};

const textBytes = (text: string) => new TextEncoder().encode(text);

test("validação rejeita tipo não permitido", async () => {
  await expectRejects(
    () =>
      validateFile({
        originalFilename: "malware.exe",
        mimeType: "application/x-msdownload",
        bytes: textBytes("x"),
      }).then(() => undefined),
    "UNSUPPORTED_EXTENSION",
  );
});

test("validação rejeita arquivo acima do limite", async () => {
  await expectRejects(
    () =>
      validateFile({
        originalFilename: "large.txt",
        mimeType: "text/plain",
        bytes: new Uint8Array(10 * 1024 * 1024 + 1),
      }).then(() => undefined),
    "FILE_TOO_LARGE",
  );
});

test("filename é sanitizado", () => {
  expect(sanitizeFilename("../Relatório Cliente 01!!.txt")).toBe(
    "relatorio-cliente-01.txt",
  );
});

test("content_hash é calculado", async () => {
  const hash = await sha256Hex(textBytes("standard"));
  expect(hash.length).toBe(64);
});

test("storage_key segue padrão seguro", () => {
  const key = buildStorageKey({
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    documentId: ids.documentId,
    safeFilename: "evidence.txt",
  });
  expect(key).toBe(
    `tenants/${ids.organizationId}/organizations/${ids.organizationId}/assessments/${ids.assessmentId}/documents/${ids.documentId}/evidence.txt`,
  );
});

test("PlainTextExtractor extrai texto", async () => {
  const extracted = await new PlainTextExtractor().extract({
    bytes: textBytes("hello"),
    mimeType: "text/plain",
    extension: "txt",
    filename: "hello.txt",
  });
  expect(extracted.text).toBe("hello");
});

test("chunker não gera chunks vazios e preserva ordem", async () => {
  const chunks = await chunkExtractedDocument({
    extracted: {
      text: "primeiro parágrafo\n\nsegundo parágrafo",
      metadata: {},
      warnings: [],
    },
    config: {
      max_tokens_estimate: 50,
      overlap_tokens_estimate: 0,
      strategy: "by_tokens_estimate",
      preserve_headings: true,
      preserve_pages: true,
    },
    organizationId: ids.organizationId,
    assessmentId: ids.assessmentId,
    documentId: ids.documentId,
    now: "2026-04-28T00:00:00.000Z",
    idFactory: () => crypto.randomUUID(),
  });
  expect(chunks.length).toBe(1);
  expect(chunks[0]!.chunk_index).toBe(0);
  expect(chunks[0]!.text_hash.length).toBe(64);
});

test("job message contém organization_id, assessment_id e trace_id", async () => {
  const deps = createInMemoryDocumentIngestionDependencies();
  const service = new DocumentIngestionService(deps);
  const result = await service.uploadDocument({
    documentId: ids.documentId,
    jobId: ids.jobId,
    file: {
      originalFilename: "evidence.txt",
      mimeType: "text/plain",
      bytes: textBytes("evidence"),
    },
    context: {
      organizationId: ids.organizationId,
      assessmentId: ids.assessmentId,
      actorId: ids.actorId,
      traceId: "trace-test-0001",
      now: "2026-04-28T00:00:00.000Z",
    },
  });
  expect(result.message.organization_id).toBe(ids.organizationId);
  expect(result.message.assessment_id).toBe(ids.assessmentId);
  expect(result.message.trace_id).toBe("trace-test-0001");
});

test("consumer mock processa documento TXT e gera chunks", async () => {
  const deps = createInMemoryDocumentIngestionDependencies();
  const service = new DocumentIngestionService(deps);
  const result = await service.uploadDocument({
    documentId: ids.documentId,
    jobId: ids.jobId,
    file: {
      originalFilename: "evidence.txt",
      mimeType: "text/plain",
      bytes: textBytes("texto de evidência para chunking"),
    },
    context: {
      organizationId: ids.organizationId,
      assessmentId: ids.assessmentId,
      actorId: ids.actorId,
      traceId: "trace-test-0001",
      now: "2026-04-28T00:00:00.000Z",
    },
  });
  await processDocumentIngestionJob(result.message, deps);
  const chunks = await deps.repositories.chunks.listChunks(
    ids.documentId,
    ids.organizationId,
    10,
  );
  const job = await deps.repositories.jobs.getJob(
    ids.jobId,
    ids.organizationId,
  );
  expect(chunks.length).toBe(1);
  expect(job!.status).toBe("succeeded");
});

test("erro no extractor marca job como failed com safe error message", async () => {
  const failingExtractor: DocumentTextExtractor = {
    supports: () => true,
    async extract() {
      throw new Error(
        "conteúdo sensível não deve aparecer completo ".repeat(20),
      );
    },
  };
  const deps = createInMemoryDocumentIngestionDependencies({
    extractors: [failingExtractor],
  });
  const service = new DocumentIngestionService(deps);
  const result = await service.uploadDocument({
    documentId: ids.documentId,
    jobId: ids.jobId,
    file: {
      originalFilename: "evidence.txt",
      mimeType: "text/plain",
      bytes: textBytes("texto"),
    },
    context: {
      organizationId: ids.organizationId,
      assessmentId: ids.assessmentId,
      actorId: ids.actorId,
      traceId: "trace-test-0001",
      now: "2026-04-28T00:00:00.000Z",
    },
  });
  await processDocumentIngestionJob(result.message, deps);
  const job = await deps.repositories.jobs.getJob(
    ids.jobId,
    ids.organizationId,
  );
  expect(job!.status).toBe("failed");
  expect(job!.error_message_safe!.length).toBe(240);
});

test("validateFile accepts valid image types and signatures", async () => {
  const validPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const pngResult = await validateFile({
    originalFilename: "screenshot.png",
    mimeType: "image/png",
    bytes: validPng,
  });
  expect(pngResult.extension).toBe("png");

  const validJpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
  ]);
  const jpegResult = await validateFile({
    originalFilename: "photo.jpg",
    mimeType: "image/jpeg",
    bytes: validJpeg,
  });
  expect(jpegResult.extension).toBe("jpg");

  const validWebp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  const webpResult = await validateFile({
    originalFilename: "image.webp",
    mimeType: "image/webp",
    bytes: validWebp,
  });
  expect(webpResult.extension).toBe("webp");
});

test("validateFile rejects images with invalid signatures", async () => {
  await expectRejects(
    () =>
      validateFile({
        originalFilename: "screenshot.png",
        mimeType: "image/png",
        bytes: new Uint8Array([0x00, 0x00, 0x00, 0x00]),
      }).then(() => undefined),
    "INVALID_FILE_SIGNATURE",
  );
});

test("AzurePdfExtractor supports images", () => {
  const extractor = new AzurePdfExtractor("key", "endpoint");
  expect(extractor.supports("image/png", "png")).toBe(true);
  expect(extractor.supports("image/jpeg", "jpg")).toBe(true);
  expect(extractor.supports("image/webp", "webp")).toBe(true);
});
