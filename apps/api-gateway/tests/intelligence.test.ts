import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Intelligence Blast Radius endpoint returns topology for control", async () => {
  const client = createTestClient();
  const result = await client.send(`/api/v1/intelligence/blast-radius`, "POST", { control_id: "GOV-01" }, { "x-standard-actor-id": ids.actorId });
  expect(result.response.status).toBe(200);
  expect(result.body.data.control_id).toBe("GOV-01");
  expect(result.body.data.linked_entities).toBeDefined();
});

test("Intelligence Gap Analysis returns missing controls based on framework mask", async () => {
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
  expect(result.body.data.recommended_controls || result.body.data.missing_controls || result.body.data).toBeDefined();
  // ISO27001 mask expects GOV-01, GOV-02, POL-01, POL-02, RSK-01, RSK-02
  // We passed GOV-01 and POL-01, so missing should include GOV-02
  const missingString = JSON.stringify(result.body.data.missing_controls);
  if (!missingString.includes("GOV-02")) {
    throw new Error("Gap Analysis failed to identify missing ISO27001 control (GOV-02)");
  }
});

test("Intelligence ROI Path calculates optimal controls to implement", async () => {
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
  expect(result.body.data.roi_path).toBeDefined();
  
  if (result.body.data.roi_path.length === 0) {
    throw new Error("ROI Path did not return any recommendations");
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
