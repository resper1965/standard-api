import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { program } from "commander";

program
  .name("standard-mcp")
  .description("MCP server for Standard GRC Platform Intelligence")
  .option(
    "-u, --url <url>",
    "Standard API base URL",
    process.env.STANDARD_API_URL || "http://127.0.0.1:8787",
  )
  .option(
    "-t, --token <token>",
    "Standard API Bearer token",
    process.env.STANDARD_API_KEY,
  )
  .option(
    "--organization-id <organizationId>",
    "Standard organization/org UUID (x-standard-tenant-id)",
    process.env.STANDARD_ORGANIZATION_ID,
  )
  .parse(process.argv);

const options = program.opts();

if (!options.token) {
  console.error(
    "Error: Standard API token is required. Pass --token or set STANDARD_API_KEY environment variable.",
  );
  process.exit(1);
}

const API_URL = options.url.replace(/\/$/, "");
const API_TOKEN = options.token as string;
const ORGANIZATION_ID = (options.organizationId as string | undefined) ?? "";

async function fetchFromApi(
  path: string,
  method: string = "GET",
  body?: unknown,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  };
  if (ORGANIZATION_ID) headers["x-standard-tenant-id"] = ORGANIZATION_ID;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let errorText = await response.text();
    try {
      const json = JSON.parse(errorText) as Record<string, unknown>;
      errorText =
        (typeof json.error === "string" ? json.error : null) ??
        (typeof json.message === "string" ? json.message : null) ??
        errorText;
    } catch {
      // Keep raw text
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Standard API Error (${response.status}): ${errorText}`,
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
  },
);

// Define tool schemas
const Tools = {
  get_scf_control: {
    name: "get_scf_control",
    description:
      "Retrieve regulatory details for an SCF control (e.g. AC-01) from the Standard GRC catalog.",
    schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The SCF control ID to fetch (e.g., 'AC-01')",
        },
      },
      required: ["id"],
    },
  },
  run_gap_analysis: {
    name: "run_gap_analysis",
    description:
      "Calculate missing controls and generate a readiness report against a specific framework mask.",
    schema: {
      type: "object",
      properties: {
        framework_mask: {
          type: "string",
          description:
            "The framework mask to analyze against (e.g., 'iso27001')",
        },
        scf_controls_implemented: {
          type: "array",
          items: { type: "string" },
          description:
            "List of SCF control IDs already implemented by the organization",
        },
      },
      required: ["framework_mask", "scf_controls_implemented"],
    },
  },
  dispatch_grc_council: {
    name: "dispatch_grc_council",
    description:
      "Asynchronously dispatch the multi-agent GRC council to process specialized security context, returning a job_id for polling.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
        target_framework_id: {
          type: "string",
          description: "The UUID of the target framework",
        },
        input: {
          type: "object",
          description:
            'Key-value input map containing the context (e.g. { "context": "incident details" })',
          additionalProperties: true,
        },
        agents: {
          type: "array",
          items: { type: "string" },
          description:
            "List of specialized agents to invoke (e.g., 'incident_triager', 'poam_architect', 'evidence_evaluator', 'board_translator')",
        },
      },
      required: ["assessment_id", "target_framework_id", "agents", "input"],
    },
  },
  poll_job_status: {
    name: "poll_job_status",
    description:
      "Retrieve the current status and output of an asynchronous GRC job (e.g. from the council).",
    schema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "The job ID returned from dispatch_grc_council",
        },
      },
      required: ["job_id"],
    },
  },
  create_assessment: {
    name: "create_assessment",
    description: "Create a new GRC compliance assessment.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the assessment",
        },
        scf_version_id: {
          type: "string",
          description: "The UUID of the SCF version to use",
        },
        organization_id: {
          type: "string",
          description:
            "The UUID of the organization (optional, defaults to default configured organization)",
        },
      },
      required: ["name", "scf_version_id"],
    },
  },
  list_assessments: {
    name: "list_assessments",
    description: "List all GRC compliance assessments.",
    schema: {
      type: "object",
      properties: {},
    },
  },
  define_scope: {
    name: "define_scope",
    description:
      "Define the scope (framework, departments, locations) for a compliance assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
        framework_id: {
          type: "string",
          description: "The ID of the target framework (e.g., 'iso27001')",
        },
        departments: {
          type: "array",
          items: { type: "string" },
          description: "List of department names in scope",
        },
        locations: {
          type: "array",
          items: { type: "string" },
          description: "List of location names in scope",
        },
      },
      required: ["assessment_id", "framework_id"],
    },
  },
  generate_soa_draft: {
    name: "generate_soa_draft",
    description:
      "Generate the Statement of Applicability (SoA) draft for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  run_evidence_analysis: {
    name: "run_evidence_analysis",
    description:
      "Run AI analysis of the uploaded evidence documents for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  generate_gap_analysis: {
    name: "generate_gap_analysis",
    description: "Generate a Gap Analysis draft for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  generate_poam_draft: {
    name: "generate_poam_draft",
    description:
      "Generate a Plan of Action & Milestones (POA&M) draft for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  generate_report_draft: {
    name: "generate_report_draft",
    description: "Generate a draft compliance report for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  get_compliance_gate: {
    name: "get_compliance_gate",
    description: "Retrieve Go/No-Go compliance gate status for an assessment.",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "The UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },
  optimize_compliance_path: {
    name: "optimize_compliance_path",
    description:
      "Calculate the optimal sequential path of SCF controls to implement to achieve compliance with a set of target frameworks. Prioritizes overlap, weight, and low evidence effort.",
    schema: {
      type: "object",
      properties: {
        framework_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Target framework IDs or codes (e.g. ['iso27001', 'soc2'])",
        },
        scf_version_id: {
          type: "string",
          description: "SCF version UUID or code (default: latest)",
        },
      },
      required: ["framework_ids"],
    },
  },

  // ── NEW: HITL + Jobs tools (closes #82) ────────────────────────────────

  list_pending_approvals: {
    name: "list_pending_approvals",
    description:
      "List pending human approval gates across all assessments for the organization. " +
      "Use this to surface items that require human review before the lifecycle can continue.",
    schema: {
      type: "object",
      properties: {
        organization_id: {
          type: "string",
          description:
            "Organization UUID (defaults to configured organization)",
        },
        gate: {
          type: "string",
          enum: [
            "soa",
            "gap_analysis",
            "maturity_assessment",
            "poam",
            "report",
          ],
          description: "Filter by specific gate type (optional)",
        },
      },
      required: [],
    },
  },

  submit_approval: {
    name: "submit_approval",
    description:
      "Submit a human approval or rejection for a specific approval gate. " +
      "IMPORTANT: This action requires an explicit human actor_id. " +
      "AI agents MUST NOT call this autonomously — always confirm with the human user before approving. " +
      "The actor_id must identify the human who reviewed and approved.",
    schema: {
      type: "object",
      properties: {
        approval_id: {
          type: "string",
          description: "UUID of the approval record to approve or reject",
        },
        decision: {
          type: "string",
          enum: ["approved", "rejected"],
          description: "The human decision: approved or rejected",
        },
        actor_id: {
          type: "string",
          description:
            "REQUIRED: Identifier of the human who is approving (email, user ID, name). " +
            "Cannot be an agent identifier. This value is recorded in the immutable audit trail.",
        },
        reason: {
          type: "string",
          description:
            "Justification for the decision (required for rejection)",
        },
      },
      required: ["approval_id", "decision", "actor_id"],
    },
  },

  list_jobs: {
    name: "list_jobs",
    description:
      "List recent async jobs for an assessment (ingestion, analysis, etc.).",
    schema: {
      type: "object",
      properties: {
        assessment_id: {
          type: "string",
          description: "UUID of the assessment",
        },
      },
      required: ["assessment_id"],
    },
  },

  wait_for_job: {
    name: "wait_for_job",
    description:
      "Poll a job until it completes or fails. Returns final job status. " +
      "Use after triggering async operations like document ingestion.",
    schema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Job UUID to poll",
        },
        max_polls: {
          type: "number",
          description:
            "Maximum polling attempts (default: 20, ~60s at 3s interval)",
        },
      },
      required: ["job_id"],
    },
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(Tools).map((t) => ({
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
        const { framework_mask, scf_controls_implemented } = request.params
          .arguments as {
          framework_mask: string;
          scf_controls_implemented: string[];
        };
        const data = await fetchFromApi(
          "/api/v1/intelligence/gap-analysis",
          "POST",
          {
            framework_mask,
            scf_controls_implemented,
          },
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "dispatch_grc_council": {
        const { assessment_id, target_framework_id, agents, input } = request
          .params.arguments as {
          assessment_id: string;
          target_framework_id: string;
          agents: string[];
          input: Record<string, unknown>;
        };
        const data = (await fetchFromApi(
          "/api/v1/intelligence/council",
          "POST",
          {
            assessment_id,
            target_framework_id,
            agents,
            input,
          },
        )) as Record<string, unknown>;
        return {
          content: [
            {
              type: "text",
              text: `Council dispatched. Job ID: ${data.job_id}\nUse 'poll_job_status' to check the output.`,
            },
          ],
        };
      }

      case "poll_job_status": {
        const { job_id } = request.params.arguments as { job_id: string };
        const data = await fetchFromApi(`/api/v1/jobs/${job_id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "create_assessment": {
        const { name, scf_version_id, organization_id } = request.params
          .arguments as {
          name: string;
          scf_version_id: string;
          organization_id?: string;
        };
        const orgId = organization_id || ORGANIZATION_ID;
        const data = await fetchFromApi("/api/v1/assessments", "POST", {
          name,
          scf_version_id,
          organization_id: orgId,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "list_assessments": {
        const data = await fetchFromApi("/api/v1/assessments");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "define_scope": {
        const { assessment_id, framework_id, departments, locations } = request
          .params.arguments as {
          assessment_id: string;
          framework_id: string;
          departments?: string[];
          locations?: string[];
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/scope`,
          "POST",
          {
            framework_id,
            departments,
            locations,
          },
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "generate_soa_draft": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/soa/draft`,
          "POST",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "run_evidence_analysis": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/evidence-analysis/run`,
          "POST",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "generate_gap_analysis": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/gap-analysis/draft`,
          "POST",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "generate_poam_draft": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/poam/draft`,
          "POST",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "generate_report_draft": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/reports/draft`,
          "POST",
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "get_compliance_gate": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/compliance-gate`,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "optimize_compliance_path": {
        const { framework_ids, scf_version_id } = request.params.arguments as {
          framework_ids: string[];
          scf_version_id?: string;
        };
        const data = await fetchFromApi(
          "/api/v1/optimizer/compliance-strategy",
          "POST",
          {
            framework_ids,
            scf_version_id,
          },
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      // ── NEW: HITL + Jobs cases (closes #82) ────────────────────────────────

      case "list_pending_approvals": {
        const { organization_id, gate } = request.params.arguments as {
          organization_id?: string;
          gate?: string;
        };
        const orgId = organization_id || ORGANIZATION_ID;
        const q = gate ? `?gate=${gate}` : "";
        const data = await fetchFromApi(
          `/api/v1/organizations/${orgId}/approvals/pending${q}`,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "submit_approval": {
        const { approval_id, decision, actor_id, reason } = request.params
          .arguments as {
          approval_id: string;
          decision: "approved" | "rejected";
          actor_id: string;
          reason?: string;
        };

        // GUARDRAIL: Reject if actor_id looks like an agent/bot identifier
        if (!actor_id || actor_id.trim().length === 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "submit_approval requires a non-empty actor_id identifying the human approver. " +
              "AI agents must not approve gates autonomously — confirm with the human user first.",
          );
        }
        const BOT_PATTERNS = [
          /^agent/i,
          /^bot/i,
          /^llm/i,
          /^ai/i,
          /^gpt/i,
          /^claude/i,
          /^gemini/i,
        ];
        if (BOT_PATTERNS.some((p) => p.test(actor_id.trim()))) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `actor_id '${actor_id}' appears to be an AI agent identifier. ` +
              "Approval gates require a human actor. Pass the human's email or user ID.",
          );
        }

        const endpoint =
          decision === "approved"
            ? `/api/v1/approvals/${approval_id}/approve`
            : `/api/v1/approvals/${approval_id}/reject`;
        const data = await fetchFromApi(endpoint, "POST", {
          actor: actor_id,
          reason,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "list_jobs": {
        const { assessment_id } = request.params.arguments as {
          assessment_id: string;
        };
        const data = await fetchFromApi(
          `/api/v1/assessments/${assessment_id}/jobs`,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "wait_for_job": {
        const { job_id, max_polls = 20 } = request.params.arguments as {
          job_id: string;
          max_polls?: number;
        };
        const TERMINAL = ["completed", "failed", "cancelled"];
        let lastData: Record<string, unknown> = {};
        for (let i = 0; i < max_polls; i++) {
          lastData = (await fetchFromApi(`/api/v1/jobs/${job_id}`)) as Record<
            string,
            unknown
          >;
          const status =
            (lastData as any)?.data?.status ?? (lastData as any)?.status;
          if (TERMINAL.includes(status)) break;
          // MCP servers run synchronously in stdio mode — approximate poll with delay
          await new Promise((r) => setTimeout(r, 3_000));
        }
        return {
          content: [{ type: "text", text: JSON.stringify(lastData, null, 2) }],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`,
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
