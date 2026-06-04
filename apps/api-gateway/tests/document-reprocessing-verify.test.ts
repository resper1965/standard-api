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

test("reprocessamento de documentos - verifica trace_id e actor_id no job de reprocessamento", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();

  // Upload document
  const uploaded = await client.sendMultipart(`/api/v1/assessments/${created.assessmentId}/documents`, uploadForm(), {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });

  const documentId = uploaded.body.document.document_id as string;
  const customTraceId = "trace-verify-reprocess-0001";

  // Reprocess document
  const reprocess = await client.send(`/api/v1/documents/${documentId}/reprocess`, "POST", { reason: "Force full extraction update" }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId,
    "x-trace-id": customTraceId
  });

  expect(reprocess.response.status).toBe(202);
  expect(reprocess.body.status).toBe("queued");
  expect(reprocess.body.trace_id).toBe(customTraceId);
  expect(reprocess.body.metadata.reprocess_requested_by).toBe(ids.actorId);
});
