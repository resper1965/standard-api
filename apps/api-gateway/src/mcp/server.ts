/**
 * Standard MCP Server
 *
 * Implements Model Context Protocol (MCP) 2025-03-26 spec
 * Transport: Streamable HTTP (POST /mcp → JSON response)
 * Auth: Bearer API Key (same as REST API)
 *
 * Docs: https://standard-api.bekaa.eu/docs/mcp
 */

import type { RequestContext } from "../http";
import type { McpToolResult } from "./tools/assessment.tools";
import {
  handleListAssessments,
  handleGetAssessment,
  handleGetAssessmentStatus,
  handleListAssessmentDocuments,
} from "./tools/assessment.tools";
import {
  handleSearchScfControls,
  handleGetScfControl,
  handleListScfFrameworks,
} from "./tools/scf.tools";
import {
  handleGetGapAnalysis,
  handleListFindings,
  handleGetFinding,
} from "./tools/gap.tools";
import {
  handleGetPlatformHealth,
  handleListSocAlerts,
} from "./tools/platform.tools";

// ── Tool Registry ──────────────────────────────────────────────────────────

export const MCP_TOOLS = [
  // Assessment Management
  {
    name: "list-assessments",
    description: "List GRC assessments for the current tenant. Optionally filter by status (draft, gap_analysis_drafted, closed, etc.) and limit results.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by assessment status (e.g. 'draft', 'gap_analysis_drafted', 'closed')" },
        limit: { type: "number", description: "Max results (default: 20, max: 100)" },
      },
    },
  },
  {
    name: "get-assessment",
    description: "Get full details of a specific assessment by ID.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "get-assessment-status",
    description: "Get the current lifecycle status and stage of a specific assessment.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "list-assessment-documents",
    description: "List evidence documents uploaded to a specific assessment.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["assessment_id"],
    },
  },
  // SCF Catalog
  {
    name: "search-scf-controls",
    description: "Search the Secure Controls Framework (SCF) catalog by keyword, domain or framework. Returns matching controls with ID, title, domain and description.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword to search (e.g. 'access control', 'encryption')" },
        domain: { type: "string", description: "SCF domain filter (e.g. 'Cryptography', 'Access Control')" },
        framework_id: { type: "string", description: "Framework filter (e.g. 'iso27001', 'soc2', 'nist-csf')" },
        limit: { type: "number", description: "Max results (default: 20, max: 100)" },
      },
    },
  },
  {
    name: "get-scf-control",
    description: "Get full details of a specific SCF control by its ID (e.g. 'CRY-01').",
    inputSchema: {
      type: "object",
      properties: {
        control_id: { type: "string", description: "SCF control ID (e.g. 'CRY-01', 'IAC-01')" },
      },
      required: ["control_id"],
    },
  },
  {
    name: "list-scf-frameworks",
    description: "List all compliance frameworks available in the SCF catalog (ISO 27001, SOC 2, NIST CSF, PCI DSS, LGPD, etc.).",
    inputSchema: { type: "object", properties: {} },
  },
  // Gap Analysis
  {
    name: "get-gap-analysis",
    description: "Get the gap analysis results for a specific assessment.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "list-findings",
    description: "List gap analysis findings for an assessment. Optionally filter by severity (critical, high, medium, low).",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
        severity: { type: "string", description: "Filter by severity: critical | high | medium | low" },
        limit: { type: "number", description: "Max results (default: 50, max: 200)" },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "get-finding",
    description: "Get full details of a specific gap finding by ID.",
    inputSchema: {
      type: "object",
      properties: {
        finding_id: { type: "string", description: "Finding UUID" },
      },
      required: ["finding_id"],
    },
  },
  // Platform
  {
    name: "get-platform-health",
    description: "Get the Standard GRC platform health: API status, error rate, latency (last 1h window).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list-soc-alerts",
    description: "[Admin only] List SOC security alerts from the last 24h. Requires platform admin privileges.",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO 8601 datetime (default: 24h ago)" },
        limit: { type: "number", description: "Max results (default: 20, max: 100)" },
      },
    },
  },
] as const;

type ToolName = typeof MCP_TOOLS[number]["name"];

// ── Dispatcher ─────────────────────────────────────────────────────────────

export async function dispatchMcpTool(
  name: string,
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  switch (name as ToolName) {
    // Assessment
    case "list-assessments":           return handleListAssessments(args, ctx);
    case "get-assessment":              return handleGetAssessment(args, ctx);
    case "get-assessment-status":       return handleGetAssessmentStatus(args, ctx);
    case "list-assessment-documents":   return handleListAssessmentDocuments(args, ctx);
    // SCF
    case "search-scf-controls":        return handleSearchScfControls(args, ctx);
    case "get-scf-control":            return handleGetScfControl(args, ctx);
    case "list-scf-frameworks":        return handleListScfFrameworks(args, ctx);
    // Gap
    case "get-gap-analysis":           return handleGetGapAnalysis(args, ctx);
    case "list-findings":              return handleListFindings(args, ctx);
    case "get-finding":                return handleGetFinding(args, ctx);
    // Platform
    case "get-platform-health":        return handleGetPlatformHealth(args, ctx);
    case "list-soc-alerts":            return handleListSocAlerts(args, ctx);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}
