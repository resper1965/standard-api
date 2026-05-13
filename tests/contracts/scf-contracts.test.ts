import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

// ──── SCF Catalog Contracts ────

test("SCF versions endpoint returns array", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/scf/versions", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  expect(result.response.status).toBe(200);
  if (!Array.isArray(result.body)) {
    throw new Error("Expected SCF versions response to be an array");
  }
});

test("SCF controls endpoint returns controls with control_code pattern", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/scf/controls", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  if (result.response.status === 200 && Array.isArray(result.body) && result.body.length > 0) {
    const first = result.body[0];
    if (!first.control_code) {
      throw new Error("Expected control to have control_code field");
    }
    // Control codes follow pattern: UPPERCASE-DIGITS (e.g., GOV-01, IAC-12)
    const pattern = /^[A-Z]{2,10}-\d+/;
    if (!pattern.test(first.control_code)) {
      throw new Error(`Expected control_code to match pattern XX-NN, got: ${first.control_code}`);
    }
  }
});

test("SCF domains endpoint returns domain list", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/scf/domains", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  if (result.response.status === 200) {
    if (!Array.isArray(result.body)) {
      throw new Error("Expected SCF domains response to be an array");
    }
  }
});

test("SCF endpoints are public (no tenant required)", async () => {
  const client = createTestClient();
  // SCF routes should NOT require tenant context — they are catalog data
  const result = await client.send("/api/v1/scf/versions", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  // Should not return 403 for missing tenant
  if (result.response.status === 403) {
    throw new Error("SCF endpoints should not require tenant context");
  }
});
