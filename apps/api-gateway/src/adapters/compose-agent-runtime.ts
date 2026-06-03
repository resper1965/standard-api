/**
 * @module compose-agent-runtime
 * @description Factory for Agent Runtime dependency graph with AI Gateway.
 */
import { createDrizzleAgentRuntimeDependencies, createInMemoryAgentRuntimeDependencies } from "@standard/agent-runtime";
import type { AgentRuntimeDependencies } from "@standard/agent-runtime";
import { CloudflareAiGatewayAdapter } from "./ai-gateway.adapter";
import type { Env } from "../index";
import type { DbClient } from "./db";

const asDb = (db: DbClient) => db as unknown as Parameters<typeof createDrizzleAgentRuntimeDependencies>[0];

export const composeDrizzleAgentRuntime = (db: DbClient, env?: Env): AgentRuntimeDependencies => ({
  ...createDrizzleAgentRuntimeDependencies(asDb(db)),
  llm: (
    env?.AI_GATEWAY_BASE_URL && env?.OPENAI_API_KEY
      ? new CloudflareAiGatewayAdapter({
          baseUrl: env.AI_GATEWAY_BASE_URL,
          apiKey: env.OPENAI_API_KEY,
          ...(env.AI_GATEWAY_TOKEN ? { gatewayToken: env.AI_GATEWAY_TOKEN } : {}),
        })
      : createInMemoryAgentRuntimeDependencies().llm
  ),
});
