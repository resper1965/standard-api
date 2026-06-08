/**
 * @module provenance-validation.test
 * @description Regression tests for AIProvenance in agent outputs (Issue #72).
 *
 * Verifies:
 * 1. AIProvenanceSchema validates correct provenance data
 * 2. AgentOutputSchema accepts output with provenance
 * 3. Production boot without AI Gateway throws
 */
import { expect, test } from "./test-kit";
import { AIProvenanceSchema, AgentOutputSchema } from "@standard/schemas";

test("AIProvenance: validates correct provenance data", () => {
  const provenance = {
    model: "gpt-4o",
    provider: "cloudflare-ai-gateway",
    is_inference: true,
    evidence_backed: false,
    token_usage: {
      prompt_tokens: 150,
      completion_tokens: 200,
      total_tokens: 350,
    },
    latency_ms: 1200,
    cache_status: "MISS" as const,
  };

  const parsed = AIProvenanceSchema.parse(provenance);
  expect(parsed.model).toBe("gpt-4o");
  expect(parsed.provider).toBe("cloudflare-ai-gateway");
  expect(parsed.is_inference).toBe(true);
  expect(parsed.evidence_backed).toBe(false);
  expect(parsed.token_usage?.total_tokens).toBe(350);
  expect(parsed.latency_ms).toBe(1200);
  expect(parsed.cache_status).toBe("MISS");
});

test("AIProvenance: rejects invalid cache_status", () => {
  const invalid = {
    model: "gpt-4o",
    provider: "cloudflare-ai-gateway",
    is_inference: true,
    evidence_backed: false,
    cache_status: "INVALID_VALUE",
  };

  expect(() => AIProvenanceSchema.parse(invalid)).toThrow();
});

test("AgentOutput: accepts output with provenance block", () => {
  const output = {
    summary: "Gap analysis completed",
    assumptions: ["Normal operations"],
    limitations: ["Limited evidence"],
    sources: ["KB entry 123"],
    confidence_score: 0.85,
    writes_final_finding: false,
    creates_official_mapping: false,
    provenance: {
      model: "gpt-4o",
      provider: "cloudflare-ai-gateway",
      is_inference: true,
      evidence_backed: false,
      token_usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
      latency_ms: 800,
    },
  };

  const parsed = AgentOutputSchema.parse(output);
  expect(parsed.provenance?.model).toBe("gpt-4o");
  expect(parsed.provenance?.provider).toBe("cloudflare-ai-gateway");
  expect(parsed.provenance?.is_inference).toBe(true);
});

test("AgentOutput: still valid without provenance (backward compatible)", () => {
  const output = {
    summary: "Gap analysis completed",
    assumptions: ["Normal operations"],
    limitations: ["Limited evidence"],
    sources: ["KB entry 123"],
    confidence_score: 0.85,
  };

  const parsed = AgentOutputSchema.parse(output);
  expect(parsed.provenance).toBeUndefined();
});

test("Production: compose-agent-runtime throws without AI keys in production", async () => {
  const { composeDrizzleAgentRuntime } =
    await import("../src/adapters/compose-agent-runtime");

  // We can't pass a real DB but we can verify the production guard logic
  // by inspecting the code contract in the preceding unit tests.
  // The factory function calls resolveLlmAdapter which throws in production.
  // This test verifies the throw behavior indirectly via a mock env.
  const productionEnv = {
    STANDARD_ENV: "production",
    // Deliberately missing: AI_GATEWAY_BASE_URL, OPENAI_API_KEY
  } as any;

  try {
    // Pass null DB — it will fail on the LLM check first (before DB access)
    composeDrizzleAgentRuntime(null as any, productionEnv);
    throw new Error("Should have thrown in production without AI keys");
  } catch (error: any) {
    expect(error.message).toContain("FATAL");
    expect(error.message).toContain("AI_GATEWAY_BASE_URL");
  }
});
