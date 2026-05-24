import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_GOV_001_CONTROL_ID, SYNTHETIC_REQ_1_1_ID, SYNTHETIC_SCF_VERSION_ID } from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("SCF control endpoint returns standardized synthetic control", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/scf/controls/${SYNTHETIC_GOV_001_CONTROL_ID}`, "GET", undefined, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.control_code).toBe("GOV-001");
  expect(result.body.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
  expect(result.body.is_synthetic).toBe(true);
});

test("SCF endpoints do not require tenant context for global official data", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/scf/versions/latest", "GET", undefined, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
});

test("SCF control by code supports versioned lookup", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/scf/controls/by-code/GOV-001?version=${SYNTHETIC_SCF_VERSION_ID}`, "GET", undefined, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.control_code).toBe("GOV-001");
});

test("SCF mappings endpoint returns official relational mapping", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/scf/requirements/${SYNTHETIC_REQ_1_1_ID}/mappings?scf_version=${SYNTHETIC_SCF_VERSION_ID}`, "GET", undefined, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.data[0].is_official).toBe(true);
  expect(result.body.data[0].control_code).toBe("GOV-001");
});

test("SCF coverage endpoint returns basic coverage summary", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/scf/frameworks/${SYNTHETIC_FRAMEWORK_ID}/coverage?scf_version=${SYNTHETIC_SCF_VERSION_ID}`, "GET", undefined, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.requirement_count).toBe(2);
  expect(result.body.mapped_requirement_count).toBe(2);
});

test("SCF admin import endpoint requires actor and records failed run safely", async () => {
  const client = createTestClient();
  const unauthorized = await client.send("/api/v1/admin/scf/import-runs", "POST", { source_type: "csv", content: "record_type\ncontrol" });
  expect(unauthorized.response.status).toBe(401);

  const failed = await client.send(
    "/api/v1/admin/scf/import-runs",
    "POST",
    { source_type: "csv", content: "record_type\ncontrol" },
    { "x-standard-actor-id": ids.actorId, authorization: "Bearer dev:platform_admin" }
  );
  expect(failed.response.status).toBe(400);
  expect(failed.body.import_run.status).toBe("failed");
});

test("SCF admin import-xlsx rejeita arquivo sem assinatura ZIP", async () => {
  const client = createTestClient();
  const form = new FormData();
  form.append("file", new Blob(["not a zip file"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "bad.xlsx");

  const result = await client.sendMultipart(
    "/api/v1/admin/scf/import-xlsx",
    form,
    {
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.tenantId,
      "authorization": "Bearer dev:platform_admin"
    }
  );

  expect(result.response.status).toBe(400);
  expect(result.body.error.code).toBe("VALIDATION_ERROR");
  expect(result.body.error.message).toBe("Invalid XLSX file: missing ZIP file signature.");
});


