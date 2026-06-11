#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "standard-grc-integration-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const API_BASE_URL = "https://standard-api.bekaa.eu";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_standard_cookbook",
        description:
          "Fetches the full LLM-friendly documentation and cookbook for the Standard GRC API. Use this to understand how to use the API, available workflows, and integration recipes.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_openapi_schemas",
        description:
          "Fetches the full OpenAPI 3.0 specification for the Standard GRC API. Use this to get exact payload types and endpoint definitions.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "explain_polling_workflow",
        description:
          "Explains how to handle asynchronous operations (like Gap Analysis and Document Analysis) that return 202 Accepted in the Standard GRC API.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "search_standard_cookbook": {
      try {
        const response = await fetch(`${API_BASE_URL}/llms-full.txt`);
        if (!response.ok) {
          throw new Error(`Failed to fetch cookbook: ${response.statusText}`);
        }
        const text = await response.text();
        return {
          content: [
            {
              type: "text",
              text: text,
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch cookbook: ${error.message}`,
        );
      }
    }

    case "get_openapi_schemas": {
      try {
        const response = await fetch(`${API_BASE_URL}/docs/openapi.json`);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch OpenAPI spec: ${response.statusText}`,
          );
        }
        const json = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(json, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch OpenAPI spec: ${error.message}`,
        );
      }
    }

    case "explain_polling_workflow": {
      const pollingDocs = `
# Handling Asynchronous Workflows (Polling)

Many endpoints in the Standard GRC API (like evidence analysis, generating a gap analysis) trigger long-running AI agents. These endpoints return \`202 Accepted\` instead of \`200 OK\`.

## 1. The 202 Accepted Response
When you make a POST request to an async endpoint, the API responds with:
\`\`\`json
{
  "status": "processing",
  "job_id": "job_12345"
}
\`\`\`

## 2. Polling Strategy
You must implement a polling mechanism to check the status of the job.
- **Interval**: Poll every 3 to 5 seconds.
- **Endpoint**: Use the appropriate GET endpoint for the resource you are generating. For example, if you called \`/api/v1/assessments/{id}/gap-analysis/draft\`, you should poll \`GET /api/v1/assessments/{id}/gap-analysis/draft\`.

## 3. Interpreting the Polling Response
- If the draft is still being generated, the API will likely return \`404 Not Found\` or a specific status indicating "processing".
- Once complete, the GET endpoint will return \`200 OK\` with the fully generated artifact (e.g., the Gap Analysis JSON).

*Always ensure your client code handles timeouts and retries elegantly.*
      `;
      return {
        content: [
          {
            type: "text",
            text: pollingDocs.trim(),
          },
        ],
      };
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`,
      );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Standard GRC Integration MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
