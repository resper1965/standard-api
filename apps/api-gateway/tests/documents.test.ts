import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const uploadForm = (filename = "evidence.txt", mimeType = "text/plain", text = "documento sintético") => {
  const form = new FormData();
  form.append("file", new Blob([text], { type: mimeType }), filename);
  form.append("classification", "internal");
  form.append("document_type", "policy");
  form.append("language", "pt-BR");
  return form;
};

test("validação rejeita arquivo sem tenant context", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm(), {
    "x-standard-actor-id": ids.actorId
  });
  expect(response.status).toBe(400);
  expect(body.error.code).toBe("TENANT_CONTEXT_REQUIRED");
});

test("upload rejeita tipo não permitido", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm("bad.exe", "application/x-msdownload"), {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(response.status).toBe(415);
  expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
});

test("upload TXT cria documento e job de extração", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm("../Evidence File!!.txt"), {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(response.status).toBe(202);
  expect(body.document.tenant_id).toBe(created.tenantId);
  expect(body.document.normalized_filename).toBe("evidence-file.txt");
  expect(body.job.status).toBe("queued");
});

test("consumer endpoint processa job e expõe chunks", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const uploaded = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm(), {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const jobId = uploaded.body.job.job_id as string;
  const documentId = uploaded.body.document.document_id as string;
  const processed = await client.send(`/api/v1/ingestion-jobs/${jobId}/process`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const chunks = await client.send(`/api/v1/documents/${documentId}/chunks`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(processed.response.status).toBe(200);
  expect(processed.body.status).toBe("succeeded");
  expect(chunks.body.data.length).toBe(1);
});

test("reprocess cria novo job sem apagar chunks anteriores", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const uploaded = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm(), {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const documentId = uploaded.body.document.document_id as string;
  await client.send(`/api/v1/ingestion-jobs/${uploaded.body.job.job_id}/process`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const before = await client.send(`/api/v1/documents/${documentId}/chunks`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const reprocess = await client.send(`/api/v1/documents/${documentId}/reprocess`, "POST", { reason: "teste" }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const after = await client.send(`/api/v1/documents/${documentId}/chunks`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(reprocess.response.status).toBe(202);
  expect(before.body.data.length).toBe(after.body.data.length);
});

test("listagem não retorna documentos de outro tenant", async () => {
  const client = createTestClient();
  const first = await client.createAssessment();
  const second = await client.createAssessment();
  await client.sendMultipart(`/api/v1/assessments/${first.assessmentId}/documents`, uploadForm(), {
    "x-standard-tenant-id": first.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const list = await client.send(`/api/v1/assessments/${first.assessmentId}/documents`, "GET", undefined, {
    "x-standard-tenant-id": second.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(list.body.data.length).toBe(0);
});

