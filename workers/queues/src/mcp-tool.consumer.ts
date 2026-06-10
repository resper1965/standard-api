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
  AGENT_RUN_QUEUE?: { send: (msg: unknown) => Promise<void> };
}

/** Known async tools — must match ASYNC_TOOLS set in mcp.routes.ts */
const KNOWN_ASYNC_TOOLS = new Set([
  "evaluate-evidence",
  "architect-remediation",
  "validar-evidencia-privacidade",
  "calcular-score-risco-terceiro",
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
    throw err; // Re-throw for queue retry
  }
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
    case "calcular-score-risco-terceiro":
      return calcularScoreRiscoTerceiroTool(args, env, traceId);
    default:
      throw new Error(`[MCP] Unhandled tool: ${toolName}`);
  }
}

/**
 * Stub implementations — replace with AI Gateway calls.
 * TODO(T1-followup): Implement via AI Gateway once AI Gateway bindings
 * are confirmed in wrangler.toml for the queues worker.
 */
async function evaluateEvidenceTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return {
    tool: "evaluate-evidence",
    status: "stub",
    args_received: Object.keys(args),
    note: "AI Gateway integration pending",
  };
}

async function architectRemediationTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return {
    tool: "architect-remediation",
    status: "stub",
    args_received: Object.keys(args),
  };
}

async function validarEvidenciaPrivacidadeTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return {
    tool: "validar-evidencia-privacidade",
    status: "stub",
    args_received: Object.keys(args),
  };
}

async function calcularScoreRiscoTerceiroTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return {
    tool: "calcular-score-risco-terceiro",
    status: "stub",
    args_received: Object.keys(args),
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
