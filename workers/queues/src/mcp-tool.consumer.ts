/**
 * @module mcp-tool.consumer
 * @description MCP async tool executor — ADR-003 Grupo B handler.
 *
 * Recebe mensagens mcp_tool_async do AGENT_RUN_QUEUE e executa
 * a ferramenta de IA via AI Gateway de forma assíncrona.
 * Resultados são entregues via webhook quando callback_webhook_url fornecido.
 *
 * ⛔ Não chamar este módulo de forma síncrona de dentro do route handler.
 *    Sempre via queue (ADR-003).
 */

export interface McpToolQueueMessage {
  queue_type: "mcp_tool_async";
  job_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  organization_id: string;
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
    const result = await dispatchTool(
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

// ── AI Gateway helper ────────────────────────────────────────────────────────

/**
 * Calls Cloudflare AI Gateway with a chat-completion style request.
 * Falls back gracefully when gateway config is absent (local dev).
 */
async function callAiGateway(
  env: McpToolEnv,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const gatewayUrl = env.AI_GATEWAY_URL;
  const token = env.AI_GATEWAY_TOKEN;
  if (!gatewayUrl || !token || gatewayUrl === "stub") {
    // Local dev or no gateway configured — return empty JSON object
    return "{}";
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
  const data = (await res.json()) as { result?: { response?: string } };
  return data.result?.response ?? "{}";
}

/** Dispatch to the appropriate tool implementation */
async function dispatchTool(
  toolName: string,
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<Record<string, unknown>> {
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
): Promise<Record<string, unknown>> {
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

  const raw = await callAiGateway(env, MODEL, systemPrompt, userPrompt);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw_response: raw };
  }

  return {
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
  };
}

/** Standard POA&M Planner — generates structured remediation plan for a finding */
async function architectRemediationTool(
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<Record<string, unknown>> {
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

  const raw = await callAiGateway(env, MODEL, systemPrompt, userPrompt);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
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
  };
}

/** Standard Evidence Analyst — validates privacy evidence compliance (LGPD/GDPR) */
async function validarEvidenciaPrivacidadeTool(
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<Record<string, unknown>> {
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

  const raw = await callAiGateway(env, MODEL, systemPrompt, userPrompt);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
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
