import type { RouteDefinition } from "../http";
import { json } from "../http";

export const agentToolsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/agent-tools/scf-controls",
    protected: true, // Only accessible via M2M or user authenticated
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
          }
        ],
        trace_id: traceId
      });
    }
  }
];

