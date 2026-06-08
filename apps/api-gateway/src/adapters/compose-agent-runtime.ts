/**
 * @module compose-agent-runtime
 * @description Factory for Agent Runtime dependency graph with AI Gateway.
 *
 * PRODUCTION SAFETY: If AI_GATEWAY_BASE_URL or OPENAI_API_KEY are missing
 * in production, this factory throws a fatal error. In development, it falls
 * back to a mock LLM with an explicit warning. This prevents silent degradation
 * where production agents return "Mock LLM output" (Issue #72).
 */
import {
  createDrizzleAgentRuntimeDependencies,
  createInMemoryAgentRuntimeDependencies,
} from "@standard/agent-runtime";
import type { AgentRuntimeDependencies } from "@standard/agent-runtime";
import { CloudflareAiGatewayAdapter } from "./ai-gateway.adapter";
import type { Env } from "../index";
import type { DbClient } from "./db";

const asDb = (db: DbClient) =>
  db as unknown as Parameters<typeof createDrizzleAgentRuntimeDependencies>[0];

/**
 * Resolves the LLM adapter based on environment configuration.
 *
 * - Production: REQUIRES AI_GATEWAY_BASE_URL + OPENAI_API_KEY. Throws if missing.
 * - Development: Falls back to in-memory mock with explicit console warning.
 */
function resolveLlmAdapter(env?: Env) {
  const hasCredentials = env?.AI_GATEWAY_BASE_URL && env?.OPENAI_API_KEY;

  if (hasCredentials) {
    return new CloudflareAiGatewayAdapter({
      baseUrl: env!.AI_GATEWAY_BASE_URL!,
      apiKey: env!.OPENAI_API_KEY!,
      ...(env!.AI_GATEWAY_TOKEN ? { gatewayToken: env!.AI_GATEWAY_TOKEN } : {}),
      metadata: { source: "api-gateway" },
    });
  }

  // Production: fail loudly — never silently degrade to mock
  const isProduction = env?.STANDARD_ENV === "production";
  if (isProduction) {
    throw new Error(
      "[standard:agent-runtime] FATAL — AI_GATEWAY_BASE_URL and OPENAI_API_KEY are required in production. " +
        "All agent operations would return mock output. " +
        "Configure with: wrangler secret put AI_GATEWAY_BASE_URL && wrangler secret put OPENAI_API_KEY",
    );
  }

  // Development: mock with loud warning
  console.warn(
    "[standard:agent-runtime] ⚠️ AI_GATEWAY_BASE_URL or OPENAI_API_KEY missing. " +
      "Using MOCK LLM — all AI responses will be empty. " +
      "This is acceptable in development but would be BLOCKED in production.",
  );
  return createInMemoryAgentRuntimeDependencies().llm;
}

export const composeDrizzleAgentRuntime = (
  db: DbClient,
  env?: Env,
): AgentRuntimeDependencies => ({
  ...createDrizzleAgentRuntimeDependencies(asDb(db)),
  llm: resolveLlmAdapter(env),
});
