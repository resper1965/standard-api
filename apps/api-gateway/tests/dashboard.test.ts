import {
  SYNTHETIC_FRAMEWORK_ID,
  SYNTHETIC_SCF_VERSION_ID,
} from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createSoaDraft = async (scfVersionId = SYNTHETIC_SCF_VERSION_ID) => {
  const client = createTestClient();
  const created = await client.createAssessment(0, scfVersionId);
  const scope = await client.send(
    `/api/v1/assessments/${created.assessmentId}/scope`,
    "POST",
    {
      title: "Synthetic scope",
      description: "Synthetic scope for dashboard tests",
      systems: ["IAM"],
      assumptions: ["Synthetic only"],
      exclusions: [],
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const scopeId = scope.body.scope_id as string;
  const draft = await client.send(
    `/api/v1/assessments/${created.assessmentId}/soa/draft`,
    "POST",
    {
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      source_scope_id: scopeId,
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  return { client, created, soaVersionId: draft.body.soa_version_id as string };
};

test("GET /api/v1/assessments/:assessmentId/summary calcula score real por STRM", async () => {
  const { client, created, soaVersionId } = await createSoaDraft();

  // 1. Check initial summary (no items implemented, score should be 0)
  const summary1 = await client.send(
    `/api/v1/assessments/${created.assessmentId}/summary`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  expect(summary1.response.status).toBe(200);
  expect(summary1.body.compliance_pct).toBe(0);
  expect(summary1.body.compliance_reason).toBe(null);
  expect(summary1.body.compliance_method).toBe("strm_real_scf_mappings");

  // 2. Fetch items and update implementation status to "implemented"
  const itemsResponse = await client.send(
    `/api/v1/soa/${soaVersionId}/items`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const items = itemsResponse.body.data;
  expect(items.length).toBeGreaterThanOrEqual(1);

  // Update first item to implemented
  const patched = await client.send(
    `/api/v1/soa/items/${items[0].soa_item_id}`,
    "PATCH",
    {
      implementation_status: "implemented",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  expect(patched.response.status).toBe(200);

  // 3. Check summary again (score should be > 0 since an item was implemented)
  const summary2 = await client.send(
    `/api/v1/assessments/${created.assessmentId}/summary`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  expect(summary2.response.status).toBe(200);
  expect(summary2.body.compliance_pct).toBeGreaterThanOrEqual(1);
  expect(summary2.body.compliance_reason).toBe(null);
  expect(summary2.body.compliance_method).toBe("strm_real_scf_mappings");
});

// ADR-001: an assessment whose scf_version has no mappings has nothing to
// weigh. This used to report a percentage built from a hardcoded
// intersects/0.5 proxy — an absent crosswalk published as a compliance number.
test("GET /assessments/:id/summary não inventa índice quando não há mapping STRM", async () => {
  const { client, created } = await createSoaDraft(ids.scfVersionId);

  const summary = await client.send(
    `/api/v1/assessments/${created.assessmentId}/summary`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  expect(summary.response.status).toBe(200);
  expect(summary.body.compliance_pct).toBe(null);
  expect(summary.body.compliance_reason).toBe("nothing_assessable");
});

test("GET /api/v1/organizations/:organizationId/dashboard calcula média de compliance", async () => {
  const { client, created, soaVersionId } = await createSoaDraft();

  // Fetch items and update implementation status to "implemented" for first item
  const itemsResponse = await client.send(
    `/api/v1/soa/${soaVersionId}/items`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const items = itemsResponse.body.data;
  await client.send(
    `/api/v1/soa/items/${items[0].soa_item_id}`,
    "PATCH",
    {
      implementation_status: "implemented",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  const dashboard = await client.send(
    `/api/v1/organizations/${created.organizationId}/dashboard`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  expect(dashboard.response.status).toBe(200);
  expect(dashboard.body.compliance_avg_pct).toBeGreaterThanOrEqual(1);
});
