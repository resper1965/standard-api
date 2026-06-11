/**
 * Standard MCP Server Routes
 *
 * POST /mcp  — MCP Streamable HTTP endpoint
 * GET  /mcp  — Returns server capabilities (for discovery)
 *
 * Protocol: Model Context Protocol 2025-03-26
 * Auth:     Authorization: Bearer <api-key>  (same as REST API)
 * Docs:     https://standard-api.bekaa.eu/docs/mcp
 *
 * ADR-003: MCP tools bifurcated into sync and async groups.
 * - Grupo A (sync)  — DB reads, calculations: respond 200 immediately
 * - Grupo B (async) — LLM/heavy processing: respond 202 + job_id via AGENT_RUN_QUEUE
 *
 * ⛔ Forbidden: await dispatchMcpTool() síncrono para tools do Grupo B
 *    Cloudflare Workers CPU time limit → timeout silencioso em LLM calls (2–30s)
 */

import type { RouteDefinition } from "../http";
import { json } from "../http";
import { MCP_TOOLS, dispatchMcpTool } from "../mcp/server";
import { checkMcpQuota } from "../middleware/mcp-quota.middleware";
import { checkAiTokenQuota } from "../middleware/ai-token-quota.middleware";
import { MCP_RESOURCES, readMcpResource } from "../mcp/resources";
import { MCP_PROMPTS, getMcpPrompt } from "../mcp/prompts";

const MCP_VERSION = "2025-03-26";
const SERVER_NAME = "standard-grc";
const SERVER_VERSION = "1.0.0";

// ── ADR-003: Async Tools Allowlist ────────────────────────────────────────
// Tools that invoke LLMs or heavy processing via Cloudflare AI Gateway.
// These MUST be dispatched via AGENT_RUN_QUEUE and return 202 immediately.
// Adding a tool here = opting into async pattern automatically.
// NOTE: calcular-score-risco-terceiro is Grupo A (sync) — pure math, no LLM
const ASYNC_TOOLS = new Set<string>([
  "evaluate-evidence",
  "architect-remediation",
  "validar-evidencia-privacidade",
]);

// Server capabilities response (returned on initialize)
const CAPABILITIES_RESPONSE = {
  protocolVersion: MCP_VERSION,
  capabilities: {
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false },
    prompts: { listChanged: false },
  },
  serverInfo: {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
};

export const mcpRoutes: RouteDefinition[] = [
  // ── GET /mcp — Discovery endpoint ─────────────────────────────────────
  {
    method: "GET",
    path: "/mcp",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      return json({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        protocol: MCP_VERSION,
        endpoint: "POST /mcp",
        auth: "Authorization: Bearer <api-key>",
        tools: MCP_TOOLS.length,
        async_tools: ASYNC_TOOLS.size,
        resources: MCP_RESOURCES.length,
        prompts: MCP_PROMPTS.length,
        docs: "/docs/mcp",
        openapi: "/docs/openapi.json",
      });
    },
  },

  // ── POST /mcp — JSON-RPC 2.0 MCP handler ──────────────────────────────
  {
    method: "POST",
    path: "/mcp",
    protected: true,
    permissions: ["agent:create"],
    requireActor: true,
    authRequired: true,
    tenantRequired: false, // tenant resolved from API key, not required header
    handler: async (ctx) => {
      let body: Record<string, unknown>;
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return json(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          },
          { status: 400 },
        );
      }

      const id = body["id"] ?? null;
      const method = body["method"] as string;
      const params = (body["params"] ?? {}) as Record<string, unknown>;

      // ── initialize ────────────────────────────────────────────────────
      if (method === "initialize") {
        return json({
          jsonrpc: "2.0",
          id,
          result: CAPABILITIES_RESPONSE,
        });
      }

      // ── tools/list ────────────────────────────────────────────────────
      if (method === "tools/list") {
        return json({
          jsonrpc: "2.0",
          id,
          result: { tools: MCP_TOOLS },
        });
      }

      // ── tools/call ────────────────────────────────────────────────────
      if (method === "tools/call") {
        const toolName = params["name"] as string;
        const toolArgs = (params["arguments"] ?? {}) as Record<string, unknown>;

        if (!toolName) {
          return json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name" },
          });
        }

        // ── ADR-003: Bifurcação sync / async ──────────────────────────
        if (ASYNC_TOOLS.has(toolName)) {
          // ── M2: Per-org MCP quota check before async dispatch ────────
          // Uses STANDARD_CACHE KV sliding window. Skip gracefully in local dev.
          if (ctx.env?.STANDARD_CACHE && ctx.organizationId) {
            const quota = await checkMcpQuota(
              ctx.organizationId,
              ctx.env.STANDARD_CACHE,
            );
            if (!quota.allowed) {
              return json(
                {
                  jsonrpc: "2.0",
                  id,
                  error: {
                    code: -32000,
                    message: `MCP quota exceeded. Retry after ${quota.retryAfterSeconds}s.`,
                    data: {
                      error: "QUOTA_EXCEEDED",
                      retry_after_seconds: quota.retryAfterSeconds,
                      limit_per_minute: quota.limitPerMinute,
                      trace_id: ctx.traceId,
                    },
                  },
                },
                {
                  status: 429,
                  headers: {
                    "Retry-After": String(quota.retryAfterSeconds),
                    "X-RateLimit-Limit": String(quota.limitPerMinute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(
                      Math.floor(Date.now() / 60_000) * 60_000 + 60_000,
                    ),
                  },
                },
              );
            }
          }

          // ── M2: Per-org AI token budget check before async dispatch ──────
          // Uses STANDARD_CACHE KV monthly counter. Skip gracefully in local dev.
          if (ctx.env?.STANDARD_CACHE && ctx.organizationId) {
            const tokenQuota = await checkAiTokenQuota(
              ctx.organizationId,
              ctx.env.STANDARD_CACHE,
            ).catch(() => null); // non-fatal — don't block if KV fails
            if (tokenQuota && !tokenQuota.allowed) {
              return json(
                {
                  jsonrpc: "2.0",
                  id,
                  error: {
                    code: -32000,
                    message: "Monthly AI token quota exceeded.",
                    data: {
                      error: "AI_TOKEN_QUOTA_EXCEEDED",
                      budget: tokenQuota.budget,
                      used: tokenQuota.used,
                      reset_date: tokenQuota.resetDate,
                      trace_id: ctx.traceId,
                    },
                  },
                },
                {
                  status: 429,
                  headers: {
                    "Retry-After": tokenQuota.resetDate,
                    "X-AI-Token-Budget": String(tokenQuota.budget),
                    "X-AI-Token-Used": String(tokenQuota.used),
                  },
                },
              );
            }
          }
          // ── Grupo B — Async (LLM / heavy) → 202 + job_id ───────────
          const jobId = crypto.randomUUID();
          const traceId = ctx.traceId ?? crypto.randomUUID();

          if (ctx.deps.AGENT_RUN_QUEUE) {
            await ctx.deps.AGENT_RUN_QUEUE.send({
              queue_type: "mcp_tool_async",
              job_id: jobId,
              tool_name: toolName,
              tool_args: toolArgs,
              organization_id: ctx.organizationId ?? null,
              actor_id: ctx.actorId ?? null,
              trace_id: traceId,
              mcp_request_id: id,
              // caller webhook endpoint — optional, set in args if provided
              webhook_url:
                (toolArgs["webhook_url"] as string | undefined) ?? null,
            });
          }
          // Note: even without queue (local dev), return 202 to preserve
          // the async contract — caller must not rely on sync behaviour.

          return json(
            {
              jsonrpc: "2.0",
              id,
              result: {
                status: "queued",
                job_id: jobId,
                trace_id: traceId,
                tool_name: toolName,
                message:
                  "Tool dispatched asynchronously. Subscribe to mcp.tool.completed webhook or poll /api/v1/agent-runs.",
              },
            },
            { status: 202 },
          );
        }

        // ── Grupo A — Sync (DB reads, calculations) → 200 immediately ─
        const result = await dispatchMcpTool(toolName, toolArgs, ctx);
        return json({ jsonrpc: "2.0", id, result });
      }

      // ── ping ──────────────────────────────────────────────────────────
      if (method === "ping") {
        return json({ jsonrpc: "2.0", id, result: {} });
      }

      // ── resources/list ───────────────────────────────────────────────
      if (method === "resources/list") {
        return json({
          jsonrpc: "2.0",
          id,
          result: { resources: MCP_RESOURCES },
        });
      }

      // ── resources/read ───────────────────────────────────────────────
      if (method === "resources/read") {
        const uri = params["uri"] as string;
        if (!uri) {
          return json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing uri parameter" },
          });
        }
        try {
          const content = await readMcpResource(uri, ctx.deps);
          return json({
            jsonrpc: "2.0",
            id,
            result: {
              contents: [{ uri, ...content }],
            },
          });
        } catch {
          return json(
            {
              jsonrpc: "2.0",
              id,
              error: { code: -32002, message: `Resource not found: ${uri}` },
            },
            { status: 404 },
          );
        }
      }

      // ── prompts/list ─────────────────────────────────────────────────
      if (method === "prompts/list") {
        return json({
          jsonrpc: "2.0",
          id,
          result: { prompts: MCP_PROMPTS },
        });
      }

      // ── prompts/get ──────────────────────────────────────────────────
      if (method === "prompts/get") {
        const promptName = params["name"] as string;
        const promptArgs = (params["arguments"] ?? {}) as Record<
          string,
          string
        >;
        if (!promptName) {
          return json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing prompt name" },
          });
        }
        try {
          const result = getMcpPrompt(promptName, promptArgs);
          return json({ jsonrpc: "2.0", id, result });
        } catch {
          return json(
            {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32002,
                message: `Prompt not found: ${promptName}`,
              },
            },
            { status: 404 },
          );
        }
      }

      // ── Unknown method ────────────────────────────────────────────────
      return json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        },
        { status: 404 },
      );
    },
  },
];
