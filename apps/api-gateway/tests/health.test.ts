import { createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

test("GET /health retorna ok", async () => {
  const client = createTestClient();
  const { response, body } = await client.send("/health");
  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.trace_id).toBe("trace-test-0001");
});

test("rota protegida sem auth retorna 401", async () => {
  const client = createTestClient();
  const { response, body } = await client.send("/api/v1/assessments/33333333-3333-4333-8333-333333333333/status");
  expect(response.status).toBe(401);
  expect(body.error.trace_id).toBe("trace-test-0001");
});
