import { createTestClient } from "./helpers";
import { expect, test } from "./test-kit";
import { createApp } from "../src/app";

// ── Rate Limit Tests ──────────────────────────────────────────────

test("rate limit: normal traffic under limit succeeds and returns headers", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  // Send a few requests — should all succeed (default limit is 120/min)
  for (let i = 0; i < 3; i++) {
    const { response } = await client.send(
      "/api/v1/assessments",
      "GET",
      undefined,
      {
        "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
        "x-standard-tenant-id": organizationId,
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("120");
    expect(response.headers.get("X-RateLimit-Reset")).toBe("0");
  }
});

test("rate limit: agent-runs has lower limit (10/min)", async () => {
  const client = createTestClient();
  const { organizationId, assessmentId } = await client.createAssessment();
  const { response } = await client.send(
    `/api/v1/assessments/${assessmentId}/agent-runs`,
    "POST",
    {
      agent_id: "FunctionalAgent",
      agent_version: "1.0",
      prompt_version: "1.0",
      model: "gpt-4",
      input: {},
      framework_id: crypto.randomUUID(),
      scf_version_id: crypto.randomUUID(),
    },
    {
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
      "x-standard-tenant-id": organizationId,
      "x-standard-mock-role": "admin",
    },
  );
  // May return 400/422/500/etc depending on runtime mocks, but NOT 429
  const isNotRateLimited = response.status !== 429;
  expect(isNotRateLimited).toBe(true);
  expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
  expect(response.headers.get("X-RateLimit-Remaining")).toBe("10");
  expect(response.headers.get("X-RateLimit-Reset")).toBe("0");
});

test("rate limit: enforces rate limiting and sets headers when KV is bound", async () => {
  const mockKVStore: Record<string, string> = {};
  const mockKV = {
    get: async (key: string) => mockKVStore[key] || null,
    put: async (key: string, val: string, options?: any) => {
      mockKVStore[key] = val;
    },
    delete: async (key: string) => {
      delete mockKVStore[key];
    },
  } as unknown as KVNamespace;

  const app = createApp(undefined, {
    STANDARD_ENV: "test",
    ALLOW_MOCK_AUTH: "true",
    STANDARD_CACHE: mockKV,
  } as any);

  const organizationId = crypto.randomUUID();
  const assessmentId = crypto.randomUUID();
  const frameworkId = crypto.randomUUID();

  // Route: /api/v1/intelligence/council has a limit of 5 requests/60s
  for (let i = 1; i <= 6; i++) {
    const response = await app.fetch(
      new Request("https://api.test/api/v1/intelligence/council", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trace-id": `trace-rate-limit-test-${i}`,
          "x-standard-tenant-id": organizationId,
          "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
          "x-standard-mock-role": "admin",
          cookie: "__csrf=test-csrf-token",
          "x-csrf-token": "test-csrf-token",
        },
        body: JSON.stringify({
          assessment_id: assessmentId,
          target_framework_id: frameworkId,
          agents: ["test-agent"],
          input: {},
        }),
      }),
    );

    if (i <= 5) {
      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe(String(5 - i));
      expect(response.status).toBe(202);
    } else {
      expect(response.status).toBe(429);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("Retry-After")).toBeDefined();
      const body = (await response.json()) as any;
      expect(body.type).toBe(
        "https://api.standard-grc.com/errors/rate_limit_exceeded",
      );
    }
  }
});
