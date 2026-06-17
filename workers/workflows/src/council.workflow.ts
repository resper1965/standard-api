import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";
import {
  AgentExecutor,
  AgentRuntimeService,
  CouncilOrchestrator,
  AgentRuntimeDependencies,
} from "@standard/agent-runtime";
import { createDrizzleAgentRuntimeDependencies } from "./adapters/agent-runtime.repository";

export interface Env {
  DATABASE_URL: string;
  /** Cloudflare Hyperdrive — regional Neon pooler (staging/prod). Absent in local dev. */
  HYPERDRIVE?: { connectionString: string };
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  STANDARD_CACHE: KVNamespace;
  /** R2 bucket for large payload claim-check (>=256KB). Shared with api-gateway. */
  STANDARD_DOCUMENTS_BUCKET: R2Bucket;
  AGENT_USAGE_QUEUE?: Queue;
}

type CouncilWorkflowParams = {
  runId: string;
  organizationId: string;
  agents: string[];
  inputData: any;
};

// ── Claim-Check helpers ───────────────────────────────────────────────────────
// Payloads < KV_THRESHOLD stay in KV (low latency, simple).
// Payloads >= KV_THRESHOLD go to R2; KV stores a compact reference { storage, r2_key }.
// This prevents KV degradation under large evidence workloads and removes the
// 512KB hard-limit that was previously blocking big assessments.

const KV_THRESHOLD_BYTES = 256 * 1024; // 256 KB

type ClaimCheckRef = { storage: "r2"; r2_key: string; size_kb: number };

async function savePayload(
  kv: KVNamespace,
  r2: R2Bucket,
  key: string,
  payload: unknown,
): Promise<void> {
  const serialized = JSON.stringify(payload);
  if (serialized.length >= KV_THRESHOLD_BYTES) {
    const r2Key = `council-payloads/${key}`;
    await r2.put(r2Key, serialized, {
      httpMetadata: { contentType: "application/json" },
    });
    const ref: ClaimCheckRef = {
      storage: "r2",
      r2_key: r2Key,
      size_kb: Math.round(serialized.length / 1024),
    };
    await kv.put(key, JSON.stringify(ref), { expirationTtl: 86400 });
  } else {
    await kv.put(key, serialized, { expirationTtl: 86400 });
  }
}

async function loadPayload(
  kv: KVNamespace,
  r2: R2Bucket,
  key: string,
): Promise<unknown | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ClaimCheckRef | unknown;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as ClaimCheckRef).storage === "r2"
  ) {
    const ref = parsed as ClaimCheckRef;
    const obj = await r2.get(ref.r2_key);
    if (!obj)
      throw new Error(
        `R2 object missing for council claim-check key: ${ref.r2_key}`,
      );
    return JSON.parse(await obj.text());
  }
  return parsed;
}

export class CouncilOrchestrationWorkflow extends WorkflowEntrypoint<
  Env,
  CouncilWorkflowParams
> {
  async run(event: WorkflowEvent<CouncilWorkflowParams>, step: WorkflowStep) {
    const { runId, organizationId, agents, inputData } = event.payload;

    // Prefer Hyperdrive when available (regional pooling); fallback to DATABASE_URL
    const connectionString =
      this.env.HYPERDRIVE?.connectionString ?? this.env.DATABASE_URL;
    const sql = neon(connectionString);
    const db = drizzle(sql, { schema: schema as any });

    let llm: any = { generateText: async () => ({ text: "", usage: {} }) };
    if (this.env.OPENAI_API_KEY && this.env.AI_GATEWAY_BASE_URL) {
      try {
        const { createOpenAI } = await import("@ai-sdk/openai");

        const headers: Record<string, string> = {
          "cf-aig-metadata": JSON.stringify({
            organization_id: organizationId,
            agent_id: "council_orchestrator",
            agent_run_id: runId,
          }),
          "cf-aig-cache-ttl": "86400",
        };

        if (this.env.AI_GATEWAY_TOKEN) {
          headers["cf-aig-authorization"] =
            `Bearer ${this.env.AI_GATEWAY_TOKEN}`;
        }

        llm = createOpenAI({
          apiKey: this.env.OPENAI_API_KEY,
          baseURL: this.env.AI_GATEWAY_BASE_URL,
          headers,
        });
      } catch (e) {
        console.error("Failed to load @ai-sdk/openai in Workflows", e);
      }
    }

    const agentDeps: AgentRuntimeDependencies = {
      ...createDrizzleAgentRuntimeDependencies(db as never),
      llm,
      ...(this.env.AGENT_USAGE_QUEUE
        ? {
            observability: {
              record: async (data) => {
                await this.env.AGENT_USAGE_QUEUE!.send({
                  queue_type: "agent_usage",
                  agent_run_id: data.agent_run_id,
                  organization_id: data.organization_id,
                  assessment_id: data.assessment_id,
                  model_provider: "cloudflare-ai-gateway",
                  model_name: data.model,
                  prompt_tokens: data.prompt_tokens ?? 0,
                  completion_tokens: data.completion_tokens ?? 0,
                  total_tokens:
                    (data.prompt_tokens ?? 0) + (data.completion_tokens ?? 0),
                  embedding_tokens: 0,
                  total_latency_ms: data.total_latency_ms,
                  tool_calls: data.tool_calls,
                  trace_id: data.trace_id,
                });
              },
            },
          }
        : {}),
    };

    const runtimeService = new AgentRuntimeService(agentDeps);
    const executor = new AgentExecutor(runtimeService, agentDeps);
    const council = new CouncilOrchestrator(runtimeService, executor);

    // Fetch the run context
    const run = await step.do(
      "fetch-run-context",
      { retries: { limit: 3, delay: 5000, backoff: "exponential" } },
      async () => {
        const rawRun = await runtimeService.getRun(runId, organizationId);
        return rawRun ? JSON.parse(JSON.stringify(rawRun)) : null;
      },
    );

    if (!run) {
      throw new Error("Council run not found during workflow start.");
    }

    // Initialize state into Claim-Check store (KV or R2 depending on payload size)
    const stateKey = `council:runs:${runId}:payload`;
    await step.do("initialize-run-state", async () => {
      const payloadSizeKB = Math.round(JSON.stringify(inputData).length / 1024);
      if (payloadSizeKB >= 256) {
        console.info(
          `[council:workflow] Large payload (${payloadSizeKB}KB) for run ${runId} — storing in R2 via claim-check.`,
        );
      }
      await savePayload(
        this.env.STANDARD_CACHE,
        this.env.STANDARD_DOCUMENTS_BUCKET,
        stateKey,
        inputData,
      );
      return { executed: true, payload_size_kb: payloadSizeKB };
    });

    let finalSummary = "Council durable execution completed.";

    for (let i = 0; i < agents.length; i++) {
      const agentName = agents[i];
      if (!agentName) continue;

      // Aggressive retries (5) and long timeout (5 mins) per LLM step
      await step.do(
        `execute-agent-${i}-${agentName}`,
        {
          retries: { limit: 5, delay: 10000, backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          // Claim-Check: Load payload (from KV or R2)
          let currentPayload = await loadPayload(
            this.env.STANDARD_CACHE,
            this.env.STANDARD_DOCUMENTS_BUCKET,
            stateKey,
          );
          if (!currentPayload) {
            throw new Error(`State lost for ${runId} during step ${agentName}`);
          }

          // Execute
          if (agentName === "evidence_evaluator") {
            currentPayload = await council.executeEvidenceEvaluator(
              organizationId,
              currentPayload,
            );
          } else if (agentName === "poam_architect") {
            currentPayload = await council.executePoamArchitect(
              organizationId,
              currentPayload,
              inputData,
            );
          } else if (agentName === "board_translator") {
            currentPayload = await council.executeBoardTranslator(
              organizationId,
              currentPayload,
              inputData,
            );
          } else if (agentName === "incident_triager") {
            currentPayload = await council.executeIncidentTriager(
              organizationId,
              currentPayload,
              inputData,
            );
          } else if (agentName === "vendor_scanner") {
            currentPayload = await council.executeVendorScanner(
              organizationId,
              currentPayload,
              inputData,
            );
          } else if (agentName === "ropa_analyzer") {
            currentPayload = await council.executeRopaAnalyzer(
              organizationId,
              currentPayload,
              inputData,
            );
          } else if (agentName === "dpia_assessor") {
            currentPayload = await council.executeDpiaAssessor(
              organizationId,
              currentPayload,
              inputData,
            );
          } else {
            currentPayload = await council.executeGenericAgent(
              organizationId,
              agentName,
              currentPayload,
              run,
              inputData,
            );
          }

          // Claim-Check: Save mutated payload (auto-routes to R2 if large)
          await savePayload(
            this.env.STANDARD_CACHE,
            this.env.STANDARD_DOCUMENTS_BUCKET,
            stateKey,
            currentPayload,
          );

          return { ok: true, agentName, ts: Date.now() };
        },
      );

      if (agentName === "board_translator") {
        // Extract final summary safely after board_translator
        const extParams = await step.do(`extract-summary-${i}`, async () => {
          const p = await loadPayload(
            this.env.STANDARD_CACHE,
            this.env.STANDARD_DOCUMENTS_BUCKET,
            stateKey,
          );
          let _sum = "Council durable execution completed.";
          if (p && typeof p === "object" && (p as any).executive_summary) {
            _sum = String((p as any).executive_summary);
          }
          return { extracted: true, summary: _sum };
        });
        finalSummary = extParams.summary;
      }
    }

    // Finalize state to database
    await step.do(
      "finalize-council-run",
      { retries: { limit: 5, delay: 5000, backoff: "exponential" } },
      async () => {
        const finalPayload =
          (await loadPayload(
            this.env.STANDARD_CACHE,
            this.env.STANDARD_DOCUMENTS_BUCKET,
            stateKey,
          )) ?? inputData;
        const sumStr: string =
          finalSummary || "Council durable execution completed.";
        await council.finalizeCouncilRun(
          runId,
          organizationId,
          finalPayload,
          sumStr,
          inputData,
        );
        return { finalized: true };
      },
    );

    return { success: true, runId, finalSummary };
  }
}
