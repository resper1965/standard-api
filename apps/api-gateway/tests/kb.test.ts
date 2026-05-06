import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const uploadForm = (text = "synthetic access control evidence for knowledge base search") => {
  const form = new FormData();
  form.append("file", new Blob([text], { type: "text/plain" }), "kb-evidence.txt");
  form.append("classification", "internal");
  form.append("document_type", "policy");
  form.append("language", "pt-BR");
  return form;
};

const createIndexedKb = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const uploaded = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm(), {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/ingestion-jobs/${uploaded.body.job.job_id}/process`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  return { client, created, documentId: uploaded.body.document.document_id as string };
};

test("KB search valida body inválido", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const result = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/search`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(result.response.status).toBe(400);
  expect(result.body.error.code).toBe("VALIDATION_ERROR");
});

test("KB indexação retorna job IDs e vector references", async () => {
  const { client, created } = await createIndexedKb();
  const result = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/index`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(result.response.status).toBe(202);
  expect(result.body.queued_job_ids.length).toBe(1);
  expect(result.body.vector_reference_ids.length).toBe(1);
});

test("KB processa embedding e busca retorna evidência candidata", async () => {
  const { client, created } = await createIndexedKb();
  const indexed = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/index`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const jobId = indexed.body.queued_job_ids[0] as string;
  await client.send(`/api/v1/kb/indexing-jobs/${jobId}/process`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const search = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/search`, "POST", {
    query: "access control",
    top_k: 5
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(search.response.status).toBe(200);
  expect(search.body.candidate_evidence).toBe(true);
  expect(search.body.data[0].assessment_id).toBe(created.assessmentId);
  expect(search.body.data[0].candidate_evidence).toBe(true);
});

test("KB vector references por documento respeita tenant", async () => {
  const { client, created, documentId } = await createIndexedKb();
  await client.send(`/api/v1/assessments/${created.assessmentId}/kb/index`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const refs = await client.send(`/api/v1/documents/${documentId}/kb/vector-references`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId
  });
  expect(refs.response.status).toBe(200);
  expect(refs.body.data.length).toBe(1);
});

