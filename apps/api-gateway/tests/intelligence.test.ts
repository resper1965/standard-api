import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Intelligence Blast Radius endpoint returns topology for control", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/intelligence/blast-radius`, "POST", { control_id: "GOV-01" }, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.data.control_id).toBe("GOV-01");
  expect(result.body.data.linked_entities).toBeDefined();
});

test("Intelligence Gap Analysis returns correct structure for framework mask", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/intelligence/gap-analysis",
    "POST",
    {
      scf_controls_implemented: ["GOV-01", "POL-01"],
      framework_mask: "iso27001"
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(result.response.status).toBe(200);
  expect(result.body.data).toBeDefined();

  // Without DB (test mode), iso27001 mapping comes from DB which is unavailable.
  // The static fallback correctly returns empty set — no invented crosswalks.
  // Rule (AGENTS.md §8): never infer mapping absent from the structured SCF base.
  // Contract: response must have the correct shape regardless of DB availability.
  const data = result.body.data;

  // Response shape: data.summary.total_required_controls, data.missing_controls (array)
  const summary = data.summary ?? data;
  if (typeof (summary.total_required_controls ?? summary.total_controls) !== "number") {
    throw new Error(`Gap Analysis response missing total_required_controls number field. Got data: ${JSON.stringify(data).slice(0,300)}`);
  }
  if (!Array.isArray(data.missing_controls)) {
    throw new Error(`Gap Analysis response missing_controls must be an array. Got: ${JSON.stringify(data).slice(0,300)}`);
  }
  // ADR-001: with no DB the framework has no mappings, so there is nothing to
  // weigh and the honest answer is null + a reason — not a percentage built
  // from a hardcoded intersects/0.5 proxy.
  // NOT `a ?? b` — null is a meaningful value here and ?? would hide it.
  const pct =
    "compliance_percentage" in summary
      ? summary.compliance_percentage
      : summary.compliancePercentage;
  if (pct === null) {
    if (summary.compliance_reason !== "nothing_assessable") {
      throw new Error(
        `null compliance_percentage must carry compliance_reason "nothing_assessable", got: ${String(summary.compliance_reason)}`,
      );
    }
  } else if (typeof pct !== "number") {
    throw new Error(`Gap Analysis response missing compliance_percentage number field`);
  } else if (pct < 0 || pct > 100) {
    throw new Error(`compliance_percentage out of range: ${pct}`);
  }
});


test("Intelligence ROI Path returns valid response structure", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/intelligence/roi-path",
    "POST",
    {
      target_framework: "iso27001",
      scf_controls_implemented: ["GOV-01"],
      top_n: 2
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(result.response.status).toBe(200);
  expect(result.body.data).toBeDefined();

  // In test mode without DB, roi_path may be empty (no invented crosswalks — correct behavior).
  // We validate the contract shape, not specific content.
  if (!Array.isArray(result.body.data.roi_path)) {
    throw new Error(`ROI Path response must have roi_path array. Got: ${JSON.stringify(result.body.data).slice(0, 300)}`);
  }
  // If roi_path has items, each must have required fields
  for (const item of result.body.data.roi_path) {
    if (!item.control_id && !item.control && !item.id) {
      throw new Error(`ROI Path item missing control identifier: ${JSON.stringify(item)}`);
    }
  }
});

test("Intelligence Endpoint rejects resource exhaustion attacks (WAF Defense)", async () => {
  const client = createTestClient();
  
  // Create an array with exactly 2001 items to trigger the Zod .max(2000) trap
  const maliciousPayload = Array.from({ length: 2001 }, (_, i) => `CTRL-${i}`);

  const result = await client.send(
    "/api/v1/intelligence/gap-analysis",
    "POST",
    {
      scf_controls_implemented: maliciousPayload,
      framework_mask: "iso27001"
    },
    { "x-standard-actor-id": ids.actorId }
  );

  // WAF Schema (Zod) validation should throw a 400 Bad Request
  expect(result.response.status).toBe(400);
  expect(result.body.error).toBeDefined();
  
  if (result.body.error.code !== "VALIDATION_ERROR") {
    throw new Error(`Expected VALIDATION_ERROR but got ${result.body.error.code}`);
  }
});

test("Intelligence Council dispatches a detached agentic execution correctly", async () => {
  const client = createTestClient();
  const validUUID = "123e4567-e89b-12d3-a456-426614174000";

  // Test successful dispatch
  const result = await client.send(
    "/api/v1/intelligence/council",
    "POST",
    {
      assessment_id: validUUID,
      target_framework_id: validUUID,
      agents: ["incident_triager", "poam_architect"],
      input: { context: "testing" }
    },
    { 
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(202);
  expect(result.body.job_id).toBeDefined();
  expect(result.body.status).toBe("accepted");
  
  // Test validation error (empty agents array)
  const resultInvalid = await client.send(
    "/api/v1/intelligence/council",
    "POST",
    {
      assessment_id: validUUID,
      target_framework_id: validUUID,
      agents: [], // at least 1 agent required
      input: {}
    },
    { 
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(resultInvalid.response.status).toBe(400);
});

test("Job Status Polling endpoint returns 404 for non-existent job", async () => {
  const client = createTestClient();
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  // When a job does not exist or we mock DB misses, it returns 404
  const result = await client.send(
    `/api/v1/jobs/${validUUID}`,
    "GET",
    undefined,
    { 
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(404);
  expect(result.body.error).toBeDefined();
  expect(result.body.error.code).toBe("NOT_FOUND");
});

test("Job Status Polling endpoint returns 200 OK and pending status for newly dispatched job", async () => {
  const client = createTestClient();
  const validUUID = "123e4567-e89b-12d3-a456-426614174000";

  // Step 1: Dispatch a job
  const dispatchResult = await client.send(
    "/api/v1/intelligence/council",
    "POST",
    {
      assessment_id: validUUID,
      target_framework_id: validUUID,
      agents: ["incident_triager"],
      input: { context: "testing" }
    },
    { 
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(dispatchResult.response.status).toBe(202);
  const jobId = dispatchResult.body.job_id;

  if (!jobId) {
    throw new Error("Dispatch did not return a valid job_id");
  }

  // Step 2: Poll the created job status
  const pollResult = await client.send(
    `/api/v1/jobs/${jobId}`,
    "GET",
    undefined,
    { 
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(pollResult.response.status).toBe(200);
  expect(pollResult.body.job_id).toBe(jobId);
  expect(pollResult.body.status).toBe("running");
});
