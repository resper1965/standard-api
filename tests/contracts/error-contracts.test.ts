import { createApp } from "../../apps/api-gateway/src/app";
import { expect, test } from "../test-kit";

test("public API error contains trace_id and not stack trace", async () => {
  const app = createApp();
  const response = await app.fetch(new Request("https://api.test/api/v1/assessments/missing/status", {
    headers: {
      "x-trace-id": "trace-error-contract-0001",
      "x-standard-tenant-id": "10000000-0000-4000-8000-000000000001",
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444"
    }
  }));
  const body = await response.json() as any;
  expect(response.status).toBe(404);
  expect(body.error.trace_id).toBe("trace-error-contract-0001");
  expect(JSON.stringify(body).includes("stack")).toBe(false);
});

