import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";
import { AgentExecutor, AgentRuntimeService, createDrizzleAgentRuntimeDependencies, type AgentRuntimeDependencies } from "@standard/agent-runtime";
import { z } from "zod";
import type { Env } from "./index";

export const AgentRunQueueMessageSchema = z.object({
  agent_run_id: schema.UuidSchema,
  tenant_id: schema.UuidSchema,
  assessment_id: schema.UuidSchema,
});

export const processAgentRunQueueMessage = async (messageBody: unknown, env: Env): Promise<void> => {
  const parsed = AgentRunQueueMessageSchema.safeParse(messageBody);
  if (!parsed.success) {
    throw new Error("Invalid agent run queue message.");
  }

  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be defined for Agent Runtime.");

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema: schema as any });

  // Here we inject the correct LLM bindings if env vars exist
  let llm: any = { generateText: async () => ({ text: "", usage: {} }) };

  if (env.OPENAI_API_KEY && env.AI_GATEWAY_BASE_URL) {
    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      llm = createOpenAI({
        apiKey: env.OPENAI_API_KEY,
        baseURL: env.AI_GATEWAY_BASE_URL,
      });
    } catch (e) {
      console.error("Failed to load @ai-sdk/openai dynamically", e);
    }
  } else {
    console.warn("OPENAI_API_KEY or AI_GATEWAY_BASE_URL missing inside Queue worker Env. Falling back to Mock.");
  }

  const agentDeps: AgentRuntimeDependencies = {
    ...createDrizzleAgentRuntimeDependencies(db as never),
    llm,
  };

  const runtimeService = new AgentRuntimeService(agentDeps);
  const executor = new AgentExecutor(runtimeService, agentDeps);

  // Fetch run early to determine route
  const run = await runtimeService.getRun(parsed.data.agent_run_id, parsed.data.tenant_id);
  if (!run) {
     console.warn(`Agent Run ${parsed.data.agent_run_id} not found in DB!`);
     return;
  }

  if (run.agent_id === ("council_orchestrator" as any)) {
      console.warn(`Agent Run ${parsed.data.agent_run_id} is a council DAG. Workflows engine must handle this. Skipping queue execution.`);
      return;
  }
  await executor.resumeRun(parsed.data.agent_run_id, parsed.data.tenant_id);
};
