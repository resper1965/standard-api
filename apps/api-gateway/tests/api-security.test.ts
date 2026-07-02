import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("rota crítica sem auth retorna UNAUTHORIZED", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);

  const result = await client.send(
    `/api/v1/assessments/${created.assessmentId}/kb/search`,
    "POST",
    {
      query: "policy",
      top_k: 3,
      search_type: "semantic",
    },
    {
      "x-standard-tenant-id": created.organizationId,
    },
  );

  expect(result.response.status).toBe(401);
  expect(result.body.error.code).toBe("UNAUTHORIZED");
});

test("admin SCF import bloqueia usuário não admin", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/admin/scf/import-runs",
    "POST",
    {
      source_type: "csv",
      source_name: "synthetic",
      version_label: "synthetic-2026",
      data: "",
    },
    {
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:customer",
    },
  );

  expect(result.response.status).toBe(403);
});

test("org_admin (human) is blocked from KB search — GRC is via API key", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);

  // 2-role model: org_admin's sole attribution is API-key management; it has no
  // kb:search permission, so a human org_admin session is forbidden. The GRC
  // work runs via API keys (M2M scopes) instead.
  const result = await client.send(
    `/api/v1/assessments/${created.assessmentId}/kb/search`,
    "POST",
    {
      query: "policy",
      top_k: 3,
      search_type: "semantic",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:org_admin",
    },
  );

  expect(result.response.status).toBe(403);
});

test("org_admin (human) is blocked from creating an agent run", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);

  const result = await client.send(
    `/api/v1/assessments/${created.assessmentId}/agent-runs`,
    "POST",
    {
      agent_id: "gap_analyst",
      agent_version: "0.1.0",
      prompt_version: "gap-v1",
      model: "mock",
      framework_id: "66666666-6666-4666-8666-666666666666",
      scf_version_id: ids.scfVersionId,
      input: { task: "synthetic" },
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:org_admin",
    },
  );

  expect(result.response.status).toBe(403);
});

test("org_admin (human) is blocked from creating an approval", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const result = await client.send(
    `/api/v1/assessments/${created.assessmentId}/approvals`,
    "POST",
    {
      gate: "soa",
      decision: "approved",
      target_type: "assessment_state",
      target_id: created.assessmentId,
      reason: "Synthetic approval.",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:org_admin",
    },
  );

  expect(result.response.status).toBe(403);
});
