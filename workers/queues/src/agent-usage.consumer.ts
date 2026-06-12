import type { Env } from "./index";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";
import { CostTrackingService } from "@standard/observability";
import { composeDrizzleObservability } from "../../../apps/api-gateway/src/adapters/compose-observability";

export type AgentUsageQueueMessage = {
  queue_type: "agent_usage";
  agent_run_id: string;
  organization_id: string;
  assessment_id: string;
  model_provider: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  embedding_tokens: number;
  total_latency_ms: number;
  tool_calls: number;
  trace_id: string;
};

export async function processAgentUsageQueueMessage(
  body: AgentUsageQueueMessage | unknown,
  env: Env,
): Promise<void> {
  const parsed = body as AgentUsageQueueMessage;

  console.log(
    `[queues] processAgentUsageQueueMessage: Received usage for agent run ${parsed.agent_run_id}`,
  );

  if (!env.DATABASE_URL) {
    if (env.STANDARD_ENV === "production") {
      throw new Error("DATABASE_URL is required for agent usage persistence");
    }
    console.warn(
      "[queues] No DATABASE_URL provided. Agent usage not persisted.",
    );
    return;
  }

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Use the same drizzle composition used by the API Gateway
  const { observability } = composeDrizzleObservability(
    db as never,
    env as never,
  );
  const costTracking = new CostTrackingService(observability);

  try {
    await costTracking.recordAgentUsage({
      organization_id: parsed.organization_id,
      assessment_id: parsed.assessment_id,
      agent_run_id: parsed.agent_run_id,
      model_provider: parsed.model_provider,
      model_name: parsed.model_name,
      prompt_tokens: parsed.prompt_tokens,
      completion_tokens: parsed.completion_tokens,
      total_tokens: parsed.total_tokens,
      embedding_tokens: parsed.embedding_tokens,
      trace_id: parsed.trace_id,
    });
    console.log(
      `[queues] Persisted agent usage for run ${parsed.agent_run_id}`,
    );
  } catch (error) {
    console.error(
      `[queues] Failed to persist agent usage for run ${parsed.agent_run_id}:`,
      error,
    );
    throw error;
  }
}
