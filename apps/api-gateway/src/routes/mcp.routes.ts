/**
 * Standard MCP Server Routes
 *
 * POST /mcp  — MCP Streamable HTTP endpoint
 * GET  /mcp  — Returns server capabilities (for discovery)
 *
 * Protocol: Model Context Protocol 2025-03-26
 * Auth:     Authorization: Bearer <api-key>  (same as REST API)
 * Docs:     https://standard-api.bekaa.eu/docs/mcp
 */

import type { RouteDefinition } from "../http";
import { json } from "../http";
import { MCP_TOOLS, dispatchMcpTool } from "../mcp/server";

const MCP_VERSION = "2025-03-26";
const SERVER_NAME = "standard-grc";
const SERVER_VERSION = "1.0.0";

// Server capabilities response (returned on initialize)
const CAPABILITIES_RESPONSE = {
  protocolVersion: MCP_VERSION,
  capabilities: {
    tools: { listChanged: false },
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
    requireActor: true,
    authRequired: true,
    tenantRequired: false, // tenant resolved from API key, not required header
    handler: async (ctx) => {
      let body: Record<string, unknown>;
      try {
        body = await ctx.request.json() as Record<string, unknown>;
      } catch {
        return json(
          { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
          { status: 400 }
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

        const result = await dispatchMcpTool(toolName, toolArgs, ctx);
        return json({ jsonrpc: "2.0", id, result });
      }

      // ── ping ──────────────────────────────────────────────────────────
      if (method === "ping") {
        return json({ jsonrpc: "2.0", id, result: {} });
      }

      // ── Unknown method ────────────────────────────────────────────────
      return json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        },
        { status: 404 }
      );
    },
  },
];
