import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createScope = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const scope = await client.send(`/api/v1/assessments/${created.assessmentId}/scope`, "POST", {
    title: "Synthetic scope",
    description: "Synthetic scope for SoA API tests",
    systems: ["IAM"],
    assumptions: ["Synthetic only"],
    exclusions: []
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  return { client, created, scopeId: scope.body.scope_id as string };
};

const createSoaDraft = async () => {
  const setup = await createScope();
  const draft = await setup.client.send(`/api/v1/assessments/${setup.created.assessmentId}/soa/draft`, "POST", {
    framework_id: SYNTHETIC_FRAMEWORK_ID,
    scf_version_id: SYNTHETIC_SCF_VERSION_ID,
    source_scope_id: setup.scopeId
  }, {
    "x-standard-tenant-id": setup.created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  return { ...setup, soaVersionId: draft.body.soa_version_id as string };
};

test("POST scope cria escopo draft multi-tenant", async () => {
  const { client, created } = await createScope();
  const scopes = await client.send(`/api/v1/assessments/${created.assessmentId}/scope`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(scopes.response.status).toBe(200);
  expect(scopes.body.data.length).toBe(1);
  expect(scopes.body.data[0].tenant_id).toBe(created.tenantId);
});

test("POST soa draft cria itens com mapping SCF oficial", async () => {
  const { client, created, soaVersionId } = await createSoaDraft();
  const items = await client.send(`/api/v1/soa/${soaVersionId}/items`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(items.response.status).toBe(200);
  expect(items.body.data.length).toBe(2);
  expect(items.body.data[0].source_mapping_id).toBeDefined();
  expect(items.body.data[0].candidate_evidence).toBe(undefined as any);
});

test("PATCH SoA item bloqueia not_applicable sem justificativa", async () => {
  const { client, created, soaVersionId } = await createSoaDraft();
  const items = await client.send(`/api/v1/soa/${soaVersionId}/items`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const patched = await client.send(`/api/v1/soa/items/${items.body.data[0].soa_item_id}`, "PATCH", {
    applicability_status: "not_applicable"
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(patched.response.status).toBe(400);
  expect(patched.body.error.code).toBe("NON_APPLICABILITY_RATIONALE_REQUIRED");
});

test("Approve SoA exige approval_event humano e bloqueia alteração posterior", async () => {
  const { client, created, soaVersionId } = await createSoaDraft();
  await client.send(`/api/v1/soa/${soaVersionId}/submit-review`, "POST", {}, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const approval = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "soa",
    target_type: "assessment_state",
    target_id: created.assessmentId,
    decision: "approved",
    reason: "Synthetic human approval"
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const approved = await client.send(`/api/v1/soa/${soaVersionId}/approve`, "POST", {
    approval_event_id: approval.body.approval_id
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(approved.response.status).toBe(200);
  expect(approved.body.status).toBe("approved");

  const items = await client.send(`/api/v1/soa/${soaVersionId}/items`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  const patched = await client.send(`/api/v1/soa/items/${items.body.data[0].soa_item_id}`, "PATCH", {
    applicability_status: "applicable"
  }, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });
  expect(patched.response.status).toBe(409);
  expect(patched.body.error.code).toBe("SOA_VERSION_IMMUTABLE");
});

