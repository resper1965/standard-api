import type { RouteDefinition } from "../http";
import { json } from "../http";

export const agentToolsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/agent-tools/scf-controls",
    protected: true, // Only accessible via M2M or user authenticated
    permissions: ["agent:read"],
    handler: async ({ request, traceId }) => {
      // The tool provides the caller with the description and JSON schema
      // of how to properly invoke the main Standard SCF Search API.
      // This is formatted as a standard OpenAI / LangChain Tool.
      const url = new URL(request.url);
      const apiEndpoint = `${url.protocol}//${url.host}/api/v1/scf/versions/{scfVersionId}/controls`;

      return json({
        tools: [
          {
            type: "function",
            function: {
              name: "search_standard_scf_controls",
              description: "Search the Standard Secure Controls Framework (SCF) to find compliance controls that mitigate specific risks or require specific privacy/security actions. Useful for finding controls by domain, keyword, or threat tags (e.g., 'DPI-Needed').",
              parameters: {
                type: "object",
                properties: {
                  scf_version_id: {
                    type: "string",
                    description: "The UUID of the SCF version to query. Leave blank or use 'latest' to query the current active framework mapping."
                  },
                  q: {
                    type: "string",
                    description: "A loose text query to search across control descriptions, questions, and titles."
                  },
                  domain_code: {
                    type: "string",
                    description: "Filter by 3-letter domain code (e.g., 'PRI' for Privacy, 'GOV' for Governance, 'CRY' for Cryptography)."
                  },
                  control_code: {
                    type: "string",
                    description: "Filter by exact or partial control code (e.g., 'PRI-01')."
                  },
                  tags: {
                    type: "string",
                    description: "Comma-separated list of threat tags or metadata flags to filter by. For example, 'DPI-Needed' or 'Ransomware'."
                  }
                },
                required: []
              },
              _meta: {
                target_endpoint: apiEndpoint,
                method: "GET",
                headers: {
                  Authorization: "Bearer <YOUR_M2M_OR_SESSION_TOKEN>"
                }
              }
            }
          },
          {
            type: "function",
            function: {
              name: "search_blast_radius",
              description: "Calculate the impact topology (Blast Radius) of a specific framework control. Use this to instantly check which Regulations, Risks, and Data Category Retention Rules would be compromised if a control fails.",
              parameters: {
                type: "object",
                properties: {
                  control_id: {
                    type: "string",
                    description: "The unique ID of the SCF control to test (e.g., 'GOV-01', 'CRY-02')."
                  }
                },
                required: ["control_id"]
              },
              _meta: {
                target_endpoint: `${url.protocol}//${url.host}/api/v1/intelligence/blast-radius`,
                method: "POST",
                headers: {
                  Authorization: "Bearer <YOUR_M2M_OR_SESSION_TOKEN>"
                }
              }
            }
          },
          {
            type: "function",
            function: {
              name: "calculate_roi_path",
              description: "Calculate the Shortest Path (ROI Path) to adhere to a specific framework. This analyzes the requested framework and the controls you currently have implemented, returning the top N controls that would mitigate the most global risks and external regulations simultaneously.",
              parameters: {
                type: "object",
                properties: {
                  target_framework: {
                    type: "string",
                    description: "The ID of the target regulation or framework you want to comply with (e.g., 'iso27001', 'gdpr')."
                  },
                  scf_controls_implemented: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "Array of SCF control IDs that the environment already has implemented successfully."
                  },
                  top_n: {
                    type: "number",
                    description: "Number of top ROI controls to return. Defaults to 5. Maximum 50."
                  }
                },
                required: ["target_framework", "scf_controls_implemented"]
              },
              _meta: {
                target_endpoint: `${url.protocol}//${url.host}/api/v1/intelligence/roi-path`,
                method: "POST",
                headers: {
                  Authorization: "Bearer <YOUR_M2M_OR_SESSION_TOKEN>",
                  "Content-Type": "application/json"
                }
              }
            }
          }
        ],
        trace_id: traceId
      });
    }
  }
];

