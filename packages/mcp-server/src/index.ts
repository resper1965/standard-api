import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { program } from "commander";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

program
  .name("standard-mcp")
  .description("MCP server for Standard GRC Platform Intelligence")
  .option("-u, --url <url>", "Standard API base URL", process.env.STANDARD_API_URL || "http://127.0.0.1:8787")
  .option("-t, --token <token>", "Standard API Bearer token", process.env.STANDARD_API_KEY)
  .parse(process.argv);

const options = program.opts();

if (!options.token) {
  console.error("Error: Standard API token is required. Pass --token or set STANDARD_API_KEY environment variable.");
  process.exit(1);
}

const API_URL = options.url.replace(/\/$/, "");
const API_TOKEN = options.token;

async function fetchFromApi(path: string, method: string = "GET", body?: any) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_TOKEN}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let errorText = await response.text();
    try {
      const json = JSON.parse(errorText);
      errorText = json.error || json.message || errorText;
    } catch (e) {
      // Keep raw
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Standard API Error (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

const server = new Server(
  {
    name: "standard-grc-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas
const Tools = {
  get_scf_control: {
    name: "get_scf_control",
    description: "Retrieve regulatory details for an SCF control (e.g. AC-01) from the Standard GRC catalog.",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The SCF control ID to fetch (e.g., 'AC-01')" }
      },
      required: ["id"],
    }
  },
  run_gap_analysis: {
    name: "run_gap_analysis",
    description: "Calculate missing controls and generate a readiness report against a specific framework mask.",
    schema: {
      type: "object",
      properties: {
        framework_mask: { type: "string", description: "The framework mask to analyze against (e.g., 'iso27001')" },
        scf_controls_implemented: { 
          type: "array", 
          items: { type: "string" }, 
          description: "List of SCF control IDs already implemented by the organization"
        }
      },
      required: ["framework_mask", "scf_controls_implemented"],
    }
  },
  dispatch_grc_council: {
    name: "dispatch_grc_council",
    description: "Asynchronously dispatch the multi-agent GRC council to process specialized security context, returning a job_id for polling.",
    schema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "The UUID of the assessment" },
        target_framework_id: { type: "string", description: "The UUID of the target framework" },
        input: { 
          type: "object", 
          description: "Key-value input map containing the context (e.g. { \"context\": \"incident details\" })",
          additionalProperties: true
        },
        agents: {
          type: "array",
          items: { type: "string" },
          description: "List of specialized agents to invoke (e.g., 'incident_triager', 'poam_architect', 'evidence_evaluator', 'board_translator')"
        }
      },
      required: ["assessment_id", "target_framework_id", "agents", "input"],
    }
  },
  poll_job_status: {
    name: "poll_job_status",
    description: "Retrieve the current status and output of an asynchronous GRC job (e.g. from the council).",
    schema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "The job ID returned from dispatch_grc_council" }
      },
      required: ["job_id"],
    }
  }
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(Tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.schema as any,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    switch (request.params.name) {
      case "get_scf_control": {
        const { id } = request.params.arguments as { id: string };
        const data = await fetchFromApi(`/api/v1/scf/controls/${id}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "run_gap_analysis": {
        const { framework_mask, scf_controls_implemented } = request.params.arguments as any;
        
        const response = await fetch(`${API_URL}/api/v1/intelligence/gap-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_TOKEN}`
          },
          body: JSON.stringify({ framework_mask, scf_controls_implemented }),
        });
        
        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "dispatch_grc_council": {
        const { assessment_id, target_framework_id, agents, input } = request.params.arguments as any;
        
        const response = await fetch(`${API_URL}/api/v1/intelligence/council`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_TOKEN}`
          },
          body: JSON.stringify({ assessment_id, target_framework_id, agents, input }),
        });

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Council dispatched. Job ID: ${data.job_id}\nPlease use the 'poll_job_status' tool to check the output.`,
            },
          ],
        };
      }

      case "poll_job_status": {
        const { job_id } = request.params.arguments as any;
        
        const response = await fetch(`${API_URL}/api/v1/jobs/${job_id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_TOKEN}`
          }
        });

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: any) {
    if (error instanceof McpError) throw error;
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Standard GRC MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
