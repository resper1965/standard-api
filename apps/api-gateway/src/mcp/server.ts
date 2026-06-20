/**
 * Standard MCP Server
 *
 * Implements Model Context Protocol (MCP) 2025-03-26 spec
 * Transport: Streamable HTTP (POST /mcp â†’ JSON response)
 * Auth: Bearer API Key (same as REST API)
 *
 * Docs: https://standard-api.bekaa.eu/docs/mcp
 *
 * Tool Registry: 33 tools across 7 categories
 *   - Assessment Management (4)
 *   - SCF Catalog (8)
 *   - SoA Lifecycle (6)
 *   - Intelligence Engine (6)
 *   - KB & Evidence AI (3)
 *   - Gap Analysis (3)
 *   - Platform Status (2)
 *   - Lifecycle (1 planned)
 */

import type { RequestContext } from "../http";
import type { McpToolResult } from "./tools/assessment.tools";

// â”€â”€ Assessment Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleListAssessments,
  handleGetAssessment,
  handleGetAssessmentStatus,
  handleListAssessmentDocuments,
} from "./tools/assessment.tools";

// â”€â”€ SCF Core Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleSearchScfControls,
  handleGetScfControl,
  handleListScfFrameworks,
} from "./tools/scf.tools";

// â”€â”€ SCF Extended Tools (Phase 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleListScfDomains,
  handleListFrameworkRequirements,
  handleGetFrameworkCoverage,
  handleGetControlMappings,
  handleCrossFrameworkMapping,
  handleGetEvidenceRequirements,
  handleCompareFrameworks,
  handleOptimizeComplianceStrategy,
} from "./tools/scf-extended.tools";

// â”€â”€ Intelligence Engine Tools (Phase 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleCalculateBlastRadius,
  handleCalculateRoiPath,
  handleCalculateComplianceScore,
  handleCalculateDpiaScore,
  handleCheckBreachSla,
  handleCalculateCrossCoverage,
} from "./tools/intelligence.tools";

// â”€â”€ KB & Evidence AI Tools (Phase 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleSearchKb,
  handleEvaluateEvidence,
  handleArchitectRemediation,
} from "./tools/kb.tools";

// â”€â”€ SoA Lifecycle Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleListSoaVersions,
  handleGetSoaVersion,
  handleListSoaItems,
  handleGetSoaItem,
  handleValidateSoa,
  handleGetSoaSummary,
} from "./tools/soa.tools";

// â”€â”€ Gap Analysis Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleGetGapAnalysis,
  handleListFindings,
  handleGetFinding,
} from "./tools/gap.tools";

// â”€â”€ Platform Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  handleGetPlatformHealth,
  handleListSocAlerts,
} from "./tools/platform.tools";

// â”€â”€ Tool Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MCP_TOOLS = [
  // â•â•â• Assessment Management â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "list-assessments",
    description:
      "List GRC assessments for the current tenant. Optionally filter by status (draft, gap_analysis_drafted, closed, etc.) and limit results.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filter by assessment status (e.g. 'draft', 'gap_analysis_drafted', 'closed')",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
        },
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
    description:
      "Get the current lifecycle status and stage of a specific assessment.",
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

  // â•â•â• SCF Catalog â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "search-scf-controls",
    description:
      "Search the Secure Controls Framework (SCF) catalog by keyword, domain or framework. Returns matching controls with ID, title, domain and description.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Keyword to search (e.g. 'access control', 'encryption')",
        },
        domain: {
          type: "string",
          description:
            "SCF domain filter (e.g. 'Cryptography', 'Access Control')",
        },
        framework_id: {
          type: "string",
          description: "Framework filter (e.g. 'iso27001', 'soc2', 'nist-csf')",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
        },
      },
    },
  },
  {
    name: "get-scf-control",
    description:
      "Get full details of a specific SCF control by its ID (e.g. 'CRY-01').",
    inputSchema: {
      type: "object",
      properties: {
        control_id: {
          type: "string",
          description: "SCF control ID (e.g. 'CRY-01', 'IAC-01')",
        },
      },
      required: ["control_id"],
    },
  },
  {
    name: "list-scf-frameworks",
    description:
      "List all compliance frameworks available in the SCF catalog (ISO 27001, SOC 2, NIST CSF, PCI DSS, LGPD, etc.).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list-scf-domains",
    description:
      "List all 33 SCF security domains (e.g. Access Control, Cryptography, Governance). Each domain groups related controls.",
    inputSchema: {
      type: "object",
      properties: {
        scf_version_id: {
          type: "string",
          description: "SCF version UUID (use 'latest' for current version)",
        },
      },
    },
  },
  {
    name: "list-framework-requirements",
    description:
      "List the requirements/clauses of a compliance framework (e.g. ISO 27001 Annex A controls, PCI DSS requirements).",
    inputSchema: {
      type: "object",
      properties: {
        framework_id: { type: "string", description: "Framework UUID" },
        limit: {
          type: "number",
          description: "Max results (default: 50, max: 200)",
        },
      },
      required: ["framework_id"],
    },
  },
  {
    name: "get-framework-coverage",
    description:
      "Get how many SCF controls a framework covers. Useful for understanding framework scope.",
    inputSchema: {
      type: "object",
      properties: {
        framework_id: { type: "string", description: "Framework UUID" },
        scf_version_id: {
          type: "string",
          description: "SCF version UUID (default: latest)",
        },
      },
      required: ["framework_id"],
    },
  },
  {
    name: "get-control-mappings",
    description:
      "Get all framework requirements that map to a specific SCF control (crosswalk). Shows which frameworks reference this control.",
    inputSchema: {
      type: "object",
      properties: {
        control_id: { type: "string", description: "SCF control UUID or code" },
        limit: {
          type: "number",
          description: "Max results (default: 50, max: 200)",
        },
      },
      required: ["control_id"],
    },
  },
  {
    name: "cross-framework-mapping",
    description:
      "Compare two frameworks through their shared SCF controls. Shows overlap percentage and controls unique to each framework.",
    inputSchema: {
      type: "object",
      properties: {
        framework_a: { type: "string", description: "First framework ID" },
        framework_b: { type: "string", description: "Second framework ID" },
        scf_version_id: {
          type: "string",
          description: "SCF version UUID (default: latest)",
        },
      },
      required: ["framework_a", "framework_b"],
    },
  },
  {
    name: "get-evidence-requirements",
    description:
      "Get the Assessment Objectives (AOs) and Evidence Request List (ERL) / required artifacts for a given SCF control code.",
    inputSchema: {
      type: "object",
      properties: {
        control_id: {
          type: "string",
          description: "SCF control UUID or code (e.g. 'GOV-01')",
        },
        scf_version_id: {
          type: "string",
          description: "SCF version UUID (default: latest)",
        },
      },
      required: ["control_id"],
    },
  },
  {
    name: "compare-frameworks",
    description:
      "Compare two frameworks using STRM NIST IR 8477 methodology. Returns overlap count, gap count, similarity index, overlapping controls list and gaps list.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Source framework ID or code (e.g. 'iso27001')",
        },
        target: {
          type: "string",
          description: "Target framework ID or code (e.g. 'soc2')",
        },
        scf_version_id: {
          type: "string",
          description: "SCF version UUID (default: latest)",
        },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "optimize-compliance-path",
    description:
      "Calculate the optimal sequential path of SCF controls to implement to achieve compliance with a set of target frameworks. Prioritizes overlap, weight, and low evidence effort.",
    inputSchema: {
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
          description: "SCF version UUID (default: latest)",
        },
      },
      required: ["framework_ids"],
    },
  },

  // â•â•â• Intelligence Engine â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "calculate-blast-radius",
    description:
      "Calculate the impact topology if a control fails: which risks, regulations, and data retention rules would be compromised. Essential for risk prioritization.",
    inputSchema: {
      type: "object",
      properties: {
        control_id: {
          type: "string",
          description: "SCF control code (e.g. 'GOV-01', 'CRY-02')",
        },
      },
      required: ["control_id"],
    },
  },
  {
    name: "calculate-roi-path",
    description:
      "Find the top N controls that would mitigate the most global risks and regulations simultaneously. The 'shortest path' to compliance with maximum impact.",
    inputSchema: {
      type: "object",
      properties: {
        target_framework: {
          type: "string",
          description: "Target framework ID (e.g. 'iso27001', 'lgpd', 'gdpr')",
        },
        scf_controls_implemented: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of SCF control IDs already implemented (e.g. ['GOV-01', 'IAC-01'])",
        },
        top_n: {
          type: "number",
          description:
            "Number of top controls to return (default: 10, max: 50)",
        },
      },
      required: ["target_framework", "scf_controls_implemented"],
    },
  },
  {
    name: "calculate-compliance-score",
    description:
      "Calculate your compliance score against a specific regulation based on which SCF controls you have implemented.",
    inputSchema: {
      type: "object",
      properties: {
        regulation_id: {
          type: "string",
          description: "Regulation ID (e.g. 'lgpd', 'gdpr', 'iso27001')",
        },
        scf_controls_implemented: {
          type: "array",
          items: { type: "string" },
          description: "Array of SCF control IDs already implemented",
        },
      },
      required: ["regulation_id", "scf_controls_implemented"],
    },
  },
  {
    name: "calculate-dpia-score",
    description:
      "Calculate a Data Protection Impact Assessment (DPIA) score for a specific regulation, considering data categories, volume, and implemented controls.",
    inputSchema: {
      type: "object",
      properties: {
        regulation_id: {
          type: "string",
          description: "Regulation ID (e.g. 'lgpd', 'gdpr')",
        },
        data_categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Data categories being processed (e.g. ['health_data', 'biometric_data'])",
        },
        volume_scale: {
          type: "string",
          description: "Volume scale: 'small', 'medium', 'large', 'very_large'",
        },
        scf_controls_implemented: {
          type: "array",
          items: { type: "string" },
          description: "Controls implemented to mitigate risk",
        },
      },
      required: ["regulation_id"],
    },
  },
  {
    name: "check-breach-sla",
    description:
      "Get the breach notification SLA for a regulation at a given severity level. Returns authority deadlines, notification requirements, and controls to activate.",
    inputSchema: {
      type: "object",
      properties: {
        regulation_id: {
          type: "string",
          description: "Regulation ID (e.g. 'lgpd', 'gdpr')",
        },
        severity: {
          type: "string",
          description: "Breach severity: 'critical', 'high', 'medium', 'low'",
        },
      },
      required: ["regulation_id", "severity"],
    },
  },
  {
    name: "calculate-cross-coverage",
    description:
      "Calculate how much of a target framework is already covered by controls you've implemented for a source framework.",
    inputSchema: {
      type: "object",
      properties: {
        source_framework: {
          type: "string",
          description: "Source framework you've been complying with",
        },
        target_framework: {
          type: "string",
          description: "Target framework you want to comply with",
        },
        scf_controls_implemented: {
          type: "array",
          items: { type: "string" },
          description: "Controls already implemented",
        },
      },
      required: [
        "source_framework",
        "target_framework",
        "scf_controls_implemented",
      ],
    },
  },

  // â•â•â• KB & Evidence AI â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "search-kb",
    description:
      "Semantic search over the assessment's knowledge base. Finds evidence documents and chunks relevant to a query. Use before evaluating evidence against controls.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
        query: {
          type: "string",
          description:
            "Search query (e.g. 'access control policy for privileged accounts')",
        },
        top_k: {
          type: "number",
          description: "Max results (default: 10, max: 30)",
        },
      },
      required: ["assessment_id", "query"],
    },
  },
  {
    name: "evaluate-evidence",
    description:
      "AI-powered evaluation of evidence against a control requirement. Determines if evidence fully, partially, or does not cover the control. Use after searching KB.",
    inputSchema: {
      type: "object",
      properties: {
        control_requirement: {
          type: "string",
          description:
            "What the control requires (e.g. 'Organization must maintain a formal access control policy reviewed annually')",
        },
        evidence_description: {
          type: "string",
          description:
            "Description of evidence found (e.g. 'Document: Access Control Policy v2.3, last reviewed March 2026, covers role-based access and privileged account management')",
        },
      },
      required: ["control_requirement", "evidence_description"],
    },
  },
  {
    name: "architect-remediation",
    description:
      "AI-powered remediation planning. Given a gap finding and optional system context, generates specific action items, priority, and estimated effort.",
    inputSchema: {
      type: "object",
      properties: {
        evidence_context: {
          type: "string",
          description: "Description of the gap/finding to remediate",
        },
        system_architecture_description: {
          type: "string",
          description:
            "Optional context about the system architecture to tailor recommendations",
        },
      },
      required: ["evidence_context"],
    },
  },

  // â•â•â• Gap Analysis â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    description:
      "List gap analysis findings for an assessment. Optionally filter by severity (critical, high, medium, low).",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
        severity: {
          type: "string",
          description: "Filter by severity: critical | high | medium | low",
        },
        limit: {
          type: "number",
          description: "Max results (default: 50, max: 200)",
        },
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

  // â•â•â• SoA Lifecycle â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "list-soa-versions",
    description:
      "List all SoA (Statement of Applicability) versions for an assessment. Shows version number, status (draft/under_review/approved/superseded), framework, and approval info.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "get-soa-version",
    description:
      "Get full details of a specific SoA version including status, framework, scope, approval tracking and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        soa_version_id: { type: "string", description: "SoA version UUID" },
      },
      required: ["soa_version_id"],
    },
  },
  {
    name: "list-soa-items",
    description:
      "List SoA items (control applicability decisions) for a specific SoA version. Filter by applicability_status (applicable, not_applicable, out_of_scope, requires_validation), implementation_status (implemented, not_implemented, not_assessed), or evidence_coverage (strong, partial, weak, absent, not_checked).",
    inputSchema: {
      type: "object",
      properties: {
        soa_version_id: { type: "string", description: "SoA version UUID" },
        applicability_status: {
          type: "string",
          description:
            "Filter: applicable, partially_applicable, not_applicable, to_be_defined, requires_validation, out_of_scope",
        },
        implementation_status: {
          type: "string",
          description:
            "Filter: implemented, partially_implemented, not_implemented, not_evidenced, not_assessed, not_applicable",
        },
        evidence_coverage: {
          type: "string",
          description:
            "Filter: strong, partial, weak, absent, conflicting, not_checked",
        },
        limit: {
          type: "number",
          description: "Max results (default: 50, max: 200)",
        },
      },
      required: ["soa_version_id"],
    },
  },
  {
    name: "get-soa-item",
    description:
      "Get full details of a specific SoA item including applicability decision, implementation status, evidence summary, mapping info, rationale, and validation notes.",
    inputSchema: {
      type: "object",
      properties: {
        soa_item_id: { type: "string", description: "SoA item UUID" },
      },
      required: ["soa_item_id"],
    },
  },
  {
    name: "validate-soa",
    description:
      "Validate a SoA version for review readiness. Checks for blocking errors (to_be_defined items, missing rationales) and warnings (unchecked evidence). Returns whether the SoA can be submitted for review.",
    inputSchema: {
      type: "object",
      properties: {
        soa_version_id: { type: "string", description: "SoA version UUID" },
        assessment_id: { type: "string", description: "Assessment UUID" },
      },
      required: ["soa_version_id", "assessment_id"],
    },
  },
  {
    name: "get-soa-summary",
    description:
      "Get aggregated statistics for a SoA: total items, applicability breakdown (how many applicable vs not_applicable vs out_of_scope), implementation breakdown, evidence coverage breakdown, and pending validations. Use assessment_id to get the latest version, or provide soa_version_id for a specific version.",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
        soa_version_id: {
          type: "string",
          description: "Optional: specific SoA version UUID (default: latest)",
        },
      },
      required: ["assessment_id"],
    },
  },
  {
    name: "validar_evidencia_privacidade",
    description:
      "Submete evidências textuais para validação contra controlos GDPR/LGPD via SCF",
    inputSchema: {
      type: "object",
      properties: {
        assessment_id: { type: "string", description: "Assessment UUID" },
        control_id: { type: "string", description: "Control UUID" },
        evidence_text: {
          type: "string",
          description: "Evidence text to validate",
        },
        target_scf_version: {
          type: "string",
          description: "Target SCF version (e.g., 2026.1.1)",
        },
      },
      required: [
        "assessment_id",
        "control_id",
        "evidence_text",
        "target_scf_version",
      ],
    },
  },
  {
    name: "calcular_score_risco_terceiro",
    description:
      "Processa respostas de vendor e injeta resultados na base Neon DB",
    inputSchema: {
      type: "object",
      properties: {
        vendor_id: { type: "string", description: "Vendor UUID" },
        assessment_id: { type: "string", description: "Assessment UUID" },
        responses_matrix: {
          type: "array",
          items: {
            type: "object",
            properties: {
              control_id: { type: "string", description: "Control UUID" },
              compliance_value: {
                type: "number",
                description: "Compliance value 0-1",
              },
            },
            required: ["control_id", "compliance_value"],
          },
        },
      },
      required: ["vendor_id", "assessment_id", "responses_matrix"],
    },
  },

  // â•â•â• Platform Status â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    name: "get-platform-health",
    description:
      "Get the Standard GRC platform health: API status, error rate, latency (last 1h window).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list-soc-alerts",
    description:
      "[Admin only] List SOC security alerts from the last 24h. Requires platform admin privileges.",
    inputSchema: {
      type: "object",
      properties: {
        since: {
          type: "string",
          description: "ISO 8601 datetime (default: 24h ago)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
        },
      },
    },
  },
] as const;

type ToolName = (typeof MCP_TOOLS)[number]["name"];

const MCP_TOOL_SCOPES: Record<string, string[]> = {
  // Assessment
  "list-assessments": ["assessment:read"],
  "get-assessment": ["assessment:read"],
  "get-assessment-status": ["assessment:read"],
  "list-assessment-documents": ["document:read"],

  // SCF Core
  "search-scf-controls": ["scf:read"],
  "get-scf-control": ["scf:read"],
  "list-scf-frameworks": ["scf:read"],

  // SCF Extended (Phase 2)
  "list-scf-domains": ["scf:read"],
  "list-framework-requirements": ["scf:read"],
  "get-framework-coverage": ["scf:read"],
  "get-control-mappings": ["scf:read"],
  "cross-framework-mapping": ["scf:read"],
  "get-evidence-requirements": ["scf:read"],
  "compare-frameworks": ["scf:read"],
  "optimize-compliance-path": ["scf:read"],

  // Intelligence Engine (Phase 1)
  "calculate-blast-radius": ["intelligence:run"],
  "calculate-roi-path": ["intelligence:run"],
  "calculate-compliance-score": ["intelligence:run"],
  "calculate-dpia-score": ["intelligence:run"],
  "check-breach-sla": ["intelligence:run"],
  "calculate-cross-coverage": ["intelligence:run"],

  // KB & Evidence AI (Phase 1)
  "search-kb": ["kb:search"],
  "evaluate-evidence": ["agent:run"],
  "architect-remediation": ["agent:run"],
  validar_evidencia_privacidade: ["agent:run"],
  calcular_score_risco_terceiro: ["agent:run"],

  // SoA Lifecycle
  "list-soa-versions": ["soa:read"],
  "get-soa-version": ["soa:read"],
  "list-soa-items": ["soa:read"],
  "get-soa-item": ["soa:read"],
  "validate-soa": ["soa:read"],
  "get-soa-summary": ["soa:read"],

  // Gap Analysis
  "get-gap-analysis": ["gap:read"],
  "list-findings": ["gap:read"],
  "get-finding": ["gap:read"],

  // Platform
  "get-platform-health": [],
  "list-soc-alerts": ["audit:read"],
};

// â”€â”€ Dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function dispatchMcpTool(
  name: string,
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  // 1. Validate organization_id / org_id parameter if supplied
  const argOrgId = (args["organization_id"] ??
    args["org_id"] ??
    args["organizationId"] ??
    args["orgId"]) as string | undefined;
  if (argOrgId && ctx.organizationId && argOrgId !== ctx.organizationId) {
    return {
      content: [
        {
          type: "text",
          text: `Forbidden: Organization context mismatch. Requested org: ${argOrgId}, Key scope: ${ctx.organizationId}`,
        },
      ],
      isError: true,
    };
  }

  // 2. Validate assessment_id if supplied (ensuring organization alignment)
  const argAssessmentId = (args["assessment_id"] ?? args["assessmentId"]) as
    | string
    | undefined;
  if (argAssessmentId && ctx.organizationId) {
    try {
      const assessment = await ctx.deps.assessments.get(
        argAssessmentId,
        ctx.organizationId,
      );
      if (!assessment) {
        return {
          content: [
            { type: "text", text: `Assessment ${argAssessmentId} not found.` },
          ],
          isError: true,
        };
      }
      if (
        ctx.organizationId &&
        assessment.organization_id !== ctx.organizationId
      ) {
        return {
          content: [
            {
              type: "text",
              text: `Forbidden: Assessment does not belong to your organization.`,
            },
          ],
          isError: true,
        };
      }
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error resolving assessment context: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // 3. Validate M2M API key scopes
  const requiredScopes = MCP_TOOL_SCOPES[name];
  if (!requiredScopes) {
    return {
      content: [
        {
          type: "text",
          text: `Forbidden: Tool has no configured scope policy.`,
        },
      ],
      isError: true,
    };
  }

  if (ctx.actorId?.startsWith("m2m:")) {
    const hasScope =
      requiredScopes.length === 0 ||
      requiredScopes.some((scope) => ctx.m2mScopes?.includes(scope));
    if (!hasScope) {
      return {
        content: [
          {
            type: "text",
            text: `Forbidden: API key lacks required scope(s): ${requiredScopes.join(", ")}`,
          },
        ],
        isError: true,
      };
    }
  }

  switch (name as ToolName) {
    // Assessment
    case "list-assessments":
      return handleListAssessments(args, ctx);
    case "get-assessment":
      return handleGetAssessment(args, ctx);
    case "get-assessment-status":
      return handleGetAssessmentStatus(args, ctx);
    case "list-assessment-documents":
      return handleListAssessmentDocuments(args, ctx);

    // SCF Core
    case "search-scf-controls":
      return handleSearchScfControls(args, ctx);
    case "get-scf-control":
      return handleGetScfControl(args, ctx);
    case "list-scf-frameworks":
      return handleListScfFrameworks(args, ctx);

    // SCF Extended (Phase 2)
    case "list-scf-domains":
      return handleListScfDomains(args, ctx);
    case "list-framework-requirements":
      return handleListFrameworkRequirements(args, ctx);
    case "get-framework-coverage":
      return handleGetFrameworkCoverage(args, ctx);
    case "get-control-mappings":
      return handleGetControlMappings(args, ctx);
    case "cross-framework-mapping":
      return handleCrossFrameworkMapping(args, ctx);
    case "get-evidence-requirements":
      return handleGetEvidenceRequirements(args, ctx);
    case "compare-frameworks":
      return handleCompareFrameworks(args, ctx);
    case "optimize-compliance-path":
      return handleOptimizeComplianceStrategy(args, ctx);

    // Intelligence Engine (Phase 1)
    case "calculate-blast-radius":
      return handleCalculateBlastRadius(args, ctx);
    case "calculate-roi-path":
      return handleCalculateRoiPath(args, ctx);
    case "calculate-compliance-score":
      return handleCalculateComplianceScore(args, ctx);
    case "calculate-dpia-score":
      return handleCalculateDpiaScore(args, ctx);
    case "check-breach-sla":
      return handleCheckBreachSla(args, ctx);
    case "calculate-cross-coverage":
      return handleCalculateCrossCoverage(args, ctx);

    // KB & Evidence AI (Phase 1)
    case "search-kb":
      return handleSearchKb(args, ctx);
    case "evaluate-evidence":
      return handleEvaluateEvidence(args, ctx);
    case "architect-remediation":
      return handleArchitectRemediation(args, ctx);
    case "validar_evidencia_privacidade":
    case "calcular_score_risco_terceiro":
      return {
        content: [
          {
            type: "text",
            text: "This tool requires async execution via AGENT_RUN_QUEUE and cannot be run synchronously.",
          },
        ],
        isError: true,
      };

    // SoA Lifecycle
    case "list-soa-versions":
      return handleListSoaVersions(args, ctx);
    case "get-soa-version":
      return handleGetSoaVersion(args, ctx);
    case "list-soa-items":
      return handleListSoaItems(args, ctx);
    case "get-soa-item":
      return handleGetSoaItem(args, ctx);
    case "validate-soa":
      return handleValidateSoa(args, ctx);
    case "get-soa-summary":
      return handleGetSoaSummary(args, ctx);

    // Gap Analysis
    case "get-gap-analysis":
      return handleGetGapAnalysis(args, ctx);
    case "list-findings":
      return handleListFindings(args, ctx);
    case "get-finding":
      return handleGetFinding(args, ctx);

    // Platform
    case "get-platform-health":
      return handleGetPlatformHealth(args, ctx);
    case "list-soc-alerts":
      return handleListSocAlerts(args, ctx);

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}. Use tools/list to see available tools.`,
          },
        ],
        isError: true,
      };
  }
}
