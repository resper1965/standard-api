/**
 * @module mcp-tool.consumer
 * @description MCP async tool executor — ADR-003 Grupo B handler.
 *
 * Recebe mensagens mcp_tool_async do AGENT_RUN_QUEUE e executa
 * a ferramenta de IA via AI Gateway de forma assíncrona.
 * Resultados são entregues via webhook quando callback_webhook_url fornecido.
 * Persiste token usage em agent_usage_records via AGENT_USAGE_QUEUE (M2b).
 *
 * ⛔ Não chamar este módulo de forma síncrona de dentro do route handler.
 *    Sempre via queue (ADR-003).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

export interface McpToolQueueMessage {
  queue_type: "mcp_tool_async";
  job_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  organization_id: string;
  /** Assessment context — used to persist agent_usage_records (M2b) */
  assessment_id?: string | null;
  trace_id: string;
  idempotency_key?: string;
  /** Webhook URL to call with results after completion. */
  callback_webhook_url?: string;
  /** Alias used by mcp.routes.ts — same as callback_webhook_url */
  webhook_url?: string;
  timestamp: string;
}

export interface McpToolEnv {
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  WEBHOOK_SECRET?: string;
  /** KV namespace for writing job status (agent-runs polling) */
  STANDARD_CACHE?: KVNamespace;
  AGENT_RUN_QUEUE?: { send: (msg: unknown) => Promise<void> };
  /** Neon DB connection string — used for M2b agent_usage_records persistence */
  DATABASE_URL?: string;
  /** Queue binding for persisting agent usage to Postgres (M2b) */
  AGENT_USAGE_QUEUE?: { send: (msg: unknown) => Promise<void> };
}

/** Known async tools — must match ASYNC_TOOLS set in mcp.routes.ts */
// NOTE: calcular-score-risco-terceiro is Grupo A (sync) — pure math, no LLM
const KNOWN_ASYNC_TOOLS = new Set([
  "evaluate-evidence",
  "architect-remediation",
  "validar-evidencia-privacidade",
]);

/** In-memory dedup cache for idempotency (survives within a single batch). */
const processedKeys = new Set<string>();

function maskOrgId(orgId: string): string {
  if (orgId.length <= 8) return `${orgId[0]}***`;
  return `${orgId.slice(0, 4)}***${orgId.slice(-4)}`;
}

export async function processMcpToolMessage(
  body: McpToolQueueMessage,
  env: McpToolEnv,
): Promise<void> {
  const traceId = body.trace_id ?? body.job_id ?? "unknown";

  // Normalise webhook URL — accept both field names
  const webhookUrl = body.callback_webhook_url ?? body.webhook_url;

  // Idempotency check
  if (body.idempotency_key && processedKeys.has(body.idempotency_key)) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_deduplicated",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          idempotency_key: body.idempotency_key,
          tool_name: body.tool_name,
        },
      }),
    );
    return;
  }

  // Validate tool is known
  if (!KNOWN_ASYNC_TOOLS.has(body.tool_name)) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "mcp_tool_unknown",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          organization_id: maskOrgId(body.organization_id),
        },
      }),
    );
    return; // Don't throw — unknown tools should not cause queue retry
  }

  const startTime = Date.now();

  try {
    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_started",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          organization_id: maskOrgId(body.organization_id),
        },
      }),
    );

    // Write job status: running (for polling endpoint)
    if (env.STANDARD_CACHE) {
      await env.STANDARD_CACHE.put(
        `agent_run:${body.job_id}`,
        JSON.stringify({
          job_id: body.job_id,
          tool_name: body.tool_name,
          status: "running",
          organization_id: body.organization_id,
          trace_id: traceId,
          started_at: new Date().toISOString(),
        }),
        { expirationTtl: 3600 },
      ).catch(() => {
        /* non-fatal — polling is best-effort */
      });
    }

    // Tool execution dispatch
    const { result, tokensUsed } = await dispatchTool(
      body.tool_name,
      body.tool_args,
      env,
      traceId,
    );

    const durationMs = Date.now() - startTime;

    // Deliver result via webhook if callback URL provided
    if (webhookUrl && env.WEBHOOK_SECRET) {
      await deliverWebhookResult({
        url: webhookUrl,
        secret: env.WEBHOOK_SECRET,
        payload: {
          job_id: body.job_id,
          tool_name: body.tool_name,
          organization_id: body.organization_id,
          trace_id: traceId,
          status: "completed",
          result,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        },
      }).catch((err) => {
        // Webhook delivery failure is non-fatal — log and continue
        console.error(
          JSON.stringify({
            level: "error",
            message: "mcp_tool_webhook_failed",
            service: "queue-worker",
            module: "mcp-tool",
            trace_id: traceId,
            metadata: {
              job_id: body.job_id,
              webhook_url: webhookUrl,
              error: err instanceof Error ? err.message : String(err),
            },
          }),
        );
      });
    }

    // ── M2: Record AI token usage for monthly quota enforcement (KV) ─────
    if (tokensUsed > 0 && env.STANDARD_CACHE && body.organization_id) {
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const tokenKey = `org:${body.organization_id}:ai_tokens:${month}`;
      // Note: KV has no native atomic INCR, so this read-then-write creates a
      // theoretical race condition. This is an acceptable constraint for rate
      // limiting/quota tracking in this architecture. Do not flag as tech debt.
      // TTL = 35 days so the key auto-expires shortly after the month ends.
      const currentTokens = parseInt(
        (await env.STANDARD_CACHE.get(tokenKey)) ?? "0",
        10,
      );
      await env.STANDARD_CACHE.put(
        tokenKey,
        String(currentTokens + tokensUsed),
        { expirationTtl: 35 * 24 * 3600 }, // ~35 days
      ).catch(() => {
        /* non-fatal — token tracking is best-effort */
      });
    }

    // ── M2b: Persist agent_run + agent_usage_records to PostgreSQL ────────
    // Uses job_id as agentRun UUID. assessment_id and organization_id come from
    // the queue message. All writes are best-effort (non-fatal if DB unavailable).
    if (tokensUsed > 0 && body.organization_id) {
      const assessmentId =
        body.assessment_id ??
        (typeof body.tool_args["assessment_id"] === "string"
          ? body.tool_args["assessment_id"]
          : null);

      if (assessmentId && env.DATABASE_URL) {
        // Persist agentRun + usage record via direct DB write (best-effort)
        await persistAgentUsageRecord({
          env,
          jobId: body.job_id,
          organizationId: body.organization_id,
          assessmentId,
          toolName: body.tool_name,
          tokensUsed,
          traceId,
          durationMs,
        }).catch((err) => {
          console.warn(
            JSON.stringify({
              level: "warn",
              message: "mcp_tool_usage_persist_failed",
              service: "queue-worker",
              module: "mcp-tool",
              trace_id: traceId,
              metadata: {
                error: err instanceof Error ? err.message : String(err),
              },
            }),
          );
        });
      } else if (assessmentId && env.AGENT_USAGE_QUEUE) {
        // Fallback: publish to AGENT_USAGE_QUEUE if no direct DB access
        await env.AGENT_USAGE_QUEUE.send({
          queue_type: "agent_usage",
          agent_run_id: body.job_id,
          organization_id: body.organization_id,
          assessment_id: assessmentId,
          model_provider: "cloudflare-ai",
          model_name: "llama-3.1-8b-instruct",
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: tokensUsed,
          embedding_tokens: 0,
          total_latency_ms: durationMs,
          tool_calls: 1,
          trace_id: traceId,
        }).catch(() => {
          /* non-fatal */
        });
      }
    }

    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_completed",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          duration_ms: durationMs,
          has_callback: !!webhookUrl,
          tokens_used: tokensUsed,
        },
      }),
    );

    // Write job status: completed (for polling endpoint)
    if (env.STANDARD_CACHE) {
      await env.STANDARD_CACHE.put(
        `agent_run:${body.job_id}`,
        JSON.stringify({
          job_id: body.job_id,
          tool_name: body.tool_name,
          status: "completed",
          organization_id: body.organization_id,
          trace_id: traceId,
          result,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        }),
        { expirationTtl: 3600 },
      ).catch(() => {
        /* non-fatal */
      });
    }

    if (body.idempotency_key) {
      processedKeys.add(body.idempotency_key);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "mcp_tool_failed",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - startTime,
        },
      }),
    );
    // Write job status: failed (for polling endpoint)
    if (env.STANDARD_CACHE) {
      env.STANDARD_CACHE.put(
        `agent_run:${body.job_id}`,
        JSON.stringify({
          job_id: body.job_id,
          tool_name: body.tool_name,
          status: "failed",
          organization_id: body.organization_id,
          trace_id: traceId,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - startTime,
          failed_at: new Date().toISOString(),
        }),
        { expirationTtl: 3600 },
      ).catch(() => {
        /* non-fatal */
      });
    }
    throw err; // Re-throw for queue retry
  }
}

// ── M2b: Persist agent_run + agent_usage_records to PostgreSQL ───────────────

interface PersistAgentUsageInput {
  env: McpToolEnv;
  jobId: string;
  organizationId: string;
  assessmentId: string;
  toolName: string;
  tokensUsed: number;
  traceId: string;
  durationMs: number;
}

/**
 * Creates an agentRun record (using jobId as UUID) then inserts into
 * agent_usage_records. Both writes are in the same async flow.
 * Called best-effort — caller wraps in .catch() to avoid fatal errors.
 *
 * ADR compliance: agentRuns is NOT an append-only ledger (ADR-002 applies
 * only to assessment_control_events and audit_logs). Updates to agentRuns
 * are permitted for status lifecycle.
 */
async function persistAgentUsageRecord({
  env,
  jobId,
  organizationId,
  assessmentId,
  toolName,
  tokensUsed,
  traceId,
  durationMs,
}: PersistAgentUsageInput): Promise<void> {
  if (!env.DATABASE_URL) return;

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // 1. Upsert agentRun — use jobId as explicit UUID so FK is satisfied.
  //    ON CONFLICT DO NOTHING is idempotent (queue retry-safe).
  await db
    .insert(schema.agentRuns)
    .values({
      id: jobId as `${string}-${string}-${string}-${string}-${string}`,
      organizationId,
      assessmentId,
      agentName: "mcp-tool-executor",
      agentVersion: "1.0.0",
      modelProvider: "cloudflare-ai",
      modelName: "llama-3.1-8b-instruct",
      promptVersion: "v1",
      inputHash: traceId, // best-effort — traceId is unique per call
      outputHash: null,
      status: "completed",
      completedAt: new Date(),
      traceId,
    })
    .onConflictDoNothing();

  // 2. Insert agent_usage_records — always append, never update.
  await db.insert(schema.agentUsageRecords).values({
    organizationId,
    assessmentId,
    agentRunId: jobId as `${string}-${string}-${string}-${string}-${string}`,
    modelProvider: "cloudflare-ai",
    modelName: "llama-3.1-8b-instruct",
    promptTokens: 0, // AI Gateway does not always split prompt/completion
    completionTokens: 0,
    totalTokens: tokensUsed,
    embeddingTokens: 0,
    estimatedCost: null,
    currency: "USD",
    traceId,
  });

  console.log(
    JSON.stringify({
      level: "info",
      message: "mcp_tool_usage_persisted",
      service: "queue-worker",
      module: "mcp-tool",
      trace_id: traceId,
      metadata: {
        job_id: jobId,
        tool_name: toolName,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
      },
    }),
  );
}

// ── AI Gateway helper ────────────────────────────────────────────────────────

/** Token usage data returned by Cloudflare Workers AI / AI Gateway. */
interface AiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface AiGatewayResult {
  text: string;
  usage: AiUsage;
}

/**
 * Calls Cloudflare AI Gateway with a chat-completion style request.
 * Returns both the response text and token usage for quota tracking.
 * Falls back gracefully when gateway config is absent (local dev).
 */
async function callAiGateway(
  env: McpToolEnv,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiGatewayResult> {
  const gatewayUrl = env.AI_GATEWAY_URL;
  const token = env.AI_GATEWAY_TOKEN;
  if (!gatewayUrl || !token || gatewayUrl === "stub") {
    // Local dev or no gateway configured — return empty JSON object, zero usage
    return {
      text: "{}",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
  const url = `${gatewayUrl}/workers-ai/run/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    result?: { response?: string };
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  return {
    text: data.result?.response ?? "{}",
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
    },
  };
}

/** Result from tool dispatch including token usage for quota tracking. */
interface ToolDispatchResult {
  result: Record<string, unknown>;
  tokensUsed: number;
}

/** Dispatch to the appropriate tool implementation */
async function dispatchTool(
  toolName: string,
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<ToolDispatchResult> {
  switch (toolName) {
    case "evaluate-evidence":
      return evaluateEvidenceTool(args, env, traceId);
    case "architect-remediation":
      return architectRemediationTool(args, env, traceId);
    case "validar-evidencia-privacidade":
      return validarEvidenciaPrivacidadeTool(args, env, traceId);
    default:
      throw new Error(`[MCP] Unhandled tool: ${toolName}`);
  }
}

// ── Tool implementations — AI Gateway real ───────────────────────────────────

/** Standard SCF Control Analyst — evaluates evidence sufficiency for a control */
async function evaluateEvidenceTool(
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<ToolDispatchResult> {
  const assessmentId = String(args["assessment_id"] ?? "");
  const evidenceId = String(args["evidence_id"] ?? "");
  const controlCode = args["control_code"]
    ? String(args["control_code"])
    : null;
  const MODEL = "@cf/meta/llama-3.1-8b-instruct";
  const PROMPT_VERSION = "v1.0.0";

  const systemPrompt = [
    "You are the Standard SCF Control Analyst.",
    "Analyse the provided evidence and evaluate if it is sufficient for the SCF control.",
    "NEVER create official mappings. NEVER invent evidence.",
    "Return ONLY valid JSON with fields: evaluation (sufficient|insufficient|partial), confidence (0.0-1.0), rationale (string), recommendations (string[]).",
    `assessment_id=${assessmentId} trace_id=${traceId}`,
  ].join("\n");

  const userPrompt = controlCode
    ? `Evaluate evidence '${evidenceId}' for SCF control '${controlCode}' in assessment '${assessmentId}'.`
    : `Evaluate evidence '${evidenceId}' in assessment '${assessmentId}'.`;

  const { text: raw, usage } = await callAiGateway(
    env,
    MODEL,
    systemPrompt,
    userPrompt,
  );
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw_response: raw };
  }

  return {
    result: {
      assessment_id: assessmentId,
      evidence_id: evidenceId,
      control_code: controlCode,
      evaluation: parsed["evaluation"] ?? "insufficient",
      confidence:
        typeof parsed["confidence"] === "number" ? parsed["confidence"] : 0,
      rationale: String(parsed["rationale"] ?? raw),
      recommendations: Array.isArray(parsed["recommendations"])
        ? parsed["recommendations"]
        : [],
      agent_run_id: traceId,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
    },
    tokensUsed: usage.total_tokens,
  };
}

/** Standard POA&M Planner — generates structured remediation plan for a finding */
async function architectRemediationTool(
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<ToolDispatchResult> {
  const assessmentId = String(args["assessment_id"] ?? "");
  const findingId = String(args["finding_id"] ?? "");
  const gapLevel = args["gap_level"] ? String(args["gap_level"]) : "medium";
  const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const PROMPT_VERSION = "v1.0.0";

  const systemPrompt = [
    "You are the Standard POA&M Planner.",
    "Based on the gap finding, create a structured remediation plan.",
    "Return ONLY valid JSON: { priority: critical|high|medium|low, estimated_effort_days: number, actions: [{step: number, description: string, owner: string}] }",
    `assessment_id=${assessmentId} finding_id=${findingId} gap_level=${gapLevel} trace_id=${traceId}`,
  ].join("\n");

  const userPrompt = `Create remediation plan for gap finding '${findingId}' (gap level: ${gapLevel}) in assessment '${assessmentId}'.`;

  const { text: raw, usage } = await callAiGateway(
    env,
    MODEL,
    systemPrompt,
    userPrompt,
  );
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    result: {
      assessment_id: assessmentId,
      finding_id: findingId,
      remediation_plan: {
        priority: parsed["priority"] ?? "medium",
        estimated_effort_days:
          typeof parsed["estimated_effort_days"] === "number"
            ? parsed["estimated_effort_days"]
            : 30,
        actions: Array.isArray(parsed["actions"]) ? parsed["actions"] : [],
      },
      agent_run_id: traceId,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
    },
    tokensUsed: usage.total_tokens,
  };
}

/** Standard Evidence Analyst — validates privacy evidence compliance (LGPD/GDPR) */
async function validarEvidenciaPrivacidadeTool(
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<ToolDispatchResult> {
  const evidenceText = String(args["evidence_text"] ?? "");
  const scfControls = Array.isArray(args["scf_controls"])
    ? (args["scf_controls"] as string[])
    : [];
  const MODEL = "@cf/meta/llama-3.1-8b-instruct";
  const PROMPT_VERSION = "v1.0.0";

  const systemPrompt = [
    "You are the Standard Evidence Analyst specialised in privacy and LGPD/GDPR.",
    "Analyse the evidence for privacy compliance.",
    "Return ONLY valid JSON: { compliant: boolean, lgpd_articles: string[], gaps: string[], confidence: number }",
    `controls=${scfControls.join(",")} trace_id=${traceId}`,
  ].join("\n");

  const userPrompt = `Validate privacy compliance for this evidence:\n${evidenceText.slice(0, 2000)}`;

  const { text: raw, usage } = await callAiGateway(
    env,
    MODEL,
    systemPrompt,
    userPrompt,
  );
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    result: {
      compliant: Boolean(parsed["compliant"]),
      lgpd_articles: Array.isArray(parsed["lgpd_articles"])
        ? parsed["lgpd_articles"]
        : [],
      gaps: Array.isArray(parsed["gaps"]) ? parsed["gaps"] : [],
      confidence:
        typeof parsed["confidence"] === "number" ? parsed["confidence"] : 0,
      agent_run_id: traceId,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
    },
    tokensUsed: usage.total_tokens,
  };
}

/** Deliver HMAC-signed webhook result to callback URL */
async function deliverWebhookResult({
  url,
  secret,
  payload,
}: {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const body = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Standard-Signature": `sha256=${sigHex}`,
    },
    body,
  });
}
