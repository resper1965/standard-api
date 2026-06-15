# Standard GRC MCP Integration Guide

> Connect AI assistants to your GRC assessments, SCF controls, intelligence engine and compliance findings through the Model Context Protocol.

The Standard GRC Platform exposes a **Model Context Protocol (MCP)** endpoint with **32 tools** across 7 categories that let any compatible AI assistant — Claude, Cursor, Windsurf, VS Code Copilot, and others — interact directly with your assessments, SCF control catalog, SoA lifecycle, intelligence engine, gap analysis findings, and evidence knowledge base.

---

## 🔌 Dual MCP Architecture (Developer vs. End-User)

The Standard GRC platform offers two distinct MCP servers depending on your role and what you are trying to achieve:

### 1. **Developer Integration MCP (`standard-grc-integration-mcp`)**
* **Who is it for?** Software Developers building integrations or writing code that consumes the Standard GRC API.
* **Where does it run?** Compiled from `packages/integration-mcp` or run locally.
* **What does it do?** It provides your IDE assistant (Cursor, VS Code Copilot, Antigravity, etc.) with local technical documentation and API reference metadata.
* **Exposed Tools:**
  * `search_standard_cookbook`: Fetches the full interactive LLM-friendly guide and cookbook (`llms-full.txt`) containing step-by-step code recipes.
  * `get_openapi_schemas`: Fetches the raw OpenAPI 3.0 specification (`openapi.json`) for exact payload structures and types.
  * `explain_polling_workflow`: Teaches the AI how to handle asynchronous operations (like Gap Analysis and Document Ingestion) returning HTTP 202.

### 2. **GRC Functional MCP (`standard-grc-mcp` / Remote `/mcp`)**
* **Who is it for?** CISOs, Compliance Officers, Security Analysts, and End-Users performing compliance assessments.
* **Where does it run?** Hosted on standard-api Gateway at `https://standard-api.bekaa.eu/mcp` or compiled from `packages/mcp-server`.
* **What does it do?** It exposes **33 GRC tools** that allow your AI assistant (Claude Desktop, Cursor IDE, etc.) to query and interact directly with your assessments, upload evidence, calculate risk scores, and check control compliance.
* **Exposed Tools:** Functional tools categorized under Assessment Management, SCF Catalog, Intelligence Engine, KB & Evidence AI, SoA Lifecycle, Gap Analysis, and Platform Status.

---

## Getting Started

### Step 1: Generate your API Key

1. Log in to the **Standard Developer Console**.
2. Navigate to **API Keys**.
3. Click **Generate New Key** and choose a descriptive name (e.g. `mcp-claude-desktop`).
4. Select the required **scopes** — at minimum `assessments:read` and `scf:read`.
5. Click **Generate**. Copy the raw key (`standard_live_...`) immediately — it will not be shown again.

> **Tip:** Use separate keys for each MCP client so you can revoke individual integrations without affecting others.

---

### Step 2: Configure your MCP client

Add the following block to your MCP client configuration file (e.g. `claude_desktop_config.json` for Claude Desktop, or your IDE's settings JSON):

```json
{
  "mcpServers": {
    "standard-grc": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://standard-api.bekaa.eu/mcp",
        "--header",
        "Authorization: Bearer standard_live_YOUR_RAW_KEY"
      ]
    }
  }
}
```

Replace `standard_live_YOUR_RAW_KEY` with the key you generated in Step 1.

> **Note:** The MCP endpoint connects directly using your API Key. Authentication is strictly organization-scoped (which acts as the single tenant boundary), and keys are bound to that scope.


---

### Step 3: Test your connection

After saving the configuration and restarting your MCP client, try these natural language queries:

- *"List all my active assessments"*
- *"What SCF controls apply to ISO 27001?"*
- *"Show me critical findings for assessment `<id>`"*
- *"What's the blast radius if control GOV-01 fails?"*
- *"Calculate the ROI path to comply with LGPD"*

A successful response confirms the integration is working. If you see errors, see the [Troubleshooting](#troubleshooting) section.

---

## Assessment Management

Interact with the full lifecycle of your GRC assessments — from listing active projects to inspecting uploaded evidence documents.

**Example queries:**

- *"Show me all assessments in the `gap_analysis_drafted` state"*
- *"Get the details for assessment `a1b2c3d4`"*
- *"What documents have been uploaded to assessment `a1b2c3d4`?"*
- *"Is the gap analysis phase complete for my current assessment?"*

### Tools

| Tool | Description |
|------|-------------|
| `list-assessments` | Returns all assessments for your organization, with optional filters for state and framework. |
| `get-assessment` | Returns full details of a single assessment, including lifecycle state, framework, and organization metadata. |
| `get-assessment-status` | Returns the current lifecycle state and last-updated timestamp for a given assessment. |
| `list-assessment-documents` | Lists all documents uploaded as evidence for a given assessment. |

---

## SCF Catalog

Browse, search and compare the Secure Controls Framework catalog — the normative source of truth for all control mappings in Standard GRC.

**Example queries:**

- *"Find SCF controls related to access control"*
- *"What does control `IAC-01` require?"*
- *"List all frameworks available in the SCF catalog"*
- *"Which SCF controls map to SOC 2 CC6.1?"*
- *"List all SCF security domains"*
- *"What requirements does ISO 27001 have?"*
- *"Compare overlap between ISO 27001 and SOC 2"*

### Tools

| Tool | Description |
|------|-------------|
| `search-scf-controls` | Full-text search over the SCF control catalog. Accepts a query string and optional domain/framework filter. |
| `get-scf-control` | Returns full details for a single SCF control, including description, objectives, mappings, and SCF version. |
| `list-scf-frameworks` | Lists all 231 frameworks supported by the SCF catalog (ISO 27001, SOC 2, NIST CSF, LGPD, etc.). |
| `list-scf-domains` | Lists all 33 SCF security domains (Access Control, Cryptography, Governance, etc.). |
| `list-framework-requirements` | Lists the requirements/clauses of a compliance framework. |
| `get-framework-coverage` | Shows how many SCF controls a framework covers and how many requirements are mapped. |
| `get-control-mappings` | Gets all framework requirements that map to a specific SCF control (crosswalk). |
| `cross-framework-mapping` | Compares two frameworks through their shared SCF controls, showing overlap percentage. |

> **Important:** The SCF catalog reflects only official mappings present in the versioned SCF base. The assistant will not invent crosswalks or mappings that do not exist in the structured data.

---

## Intelligence Engine

Run compliance calculations, risk analysis, and decision-support queries powered by the Standard Intelligence Engine. These tools are **stateless** — they compute results from the SCF data layer without requiring an active assessment.

**Example queries:**

- *"What's the blast radius if control CRY-03 fails?"*
- *"Calculate the ROI path to ISO 27001 given I have GOV-01 and IAC-01 implemented"*
- *"What's my compliance score against LGPD?"*
- *"Do I need a DPIA for processing health data under GDPR?"*
- *"What's the breach notification SLA for LGPD at critical severity?"*
- *"How much of NIST CSF am I covering with my ISO 27001 controls?"*

### Tools

| Tool | Description |
|------|-------------|
| `calculate-blast-radius` | Impact topology: which risks, regulations, and data retention rules would be compromised if a control fails. |
| `calculate-roi-path` | Finds the top N controls that mitigate the most global risks simultaneously — the "shortest path" to compliance. |
| `calculate-compliance-score` | Calculates your compliance score against a regulation based on implemented SCF controls. |
| `calculate-dpia-score` | DPIA risk assessment considering data categories, volume scale, and mitigating controls. |
| `check-breach-sla` | Breach notification SLA: authority deadlines, notification requirements, and controls to activate. |
| `calculate-cross-coverage` | Calculates how much of a target framework is covered by controls implemented for a source framework. |

---

## KB & Evidence AI

Search your assessment's knowledge base and use AI-assisted evaluation patterns to assess evidence coverage against controls.

**Example queries:**

- *"Search the KB for 'access control policy' in assessment `<id>`"*
- *"Evaluate if my firewall documentation covers the encryption control requirement"*
- *"Architect a remediation plan for the missing MFA gap"*

### Tools

| Tool | Description |
|------|-------------|
| `search-kb` | Semantic search over the assessment's knowledge base. Finds evidence documents relevant to a query. |
| `evaluate-evidence` | AI-assisted evidence evaluation. Returns a structured schema for assessing control coverage. |
| `architect-remediation` | AI-assisted remediation planning. Returns a structured schema for designing action items. |

> **Note:** `evaluate-evidence` and `architect-remediation` return evaluation templates — the AI assistant fills them in using its reasoning capabilities. This design ensures the AI agent IS the evaluator, maintaining full auditability.

---

## SoA Lifecycle

Manage the full Statement of Applicability lifecycle: list versions, inspect items, validate readiness for review, and get summary statistics.

**Example queries:**

- *"List all SoA versions for assessment `a1b2c3d4`"*
- *"Show me items marked as `not_applicable` in the latest SoA"*
- *"How many controls are `requires_validation` vs `applicable`?"*
- *"Is the SoA ready for review submission?"*
- *"Give me a summary breakdown of the SoA"*

### Tools

| Tool | Description |
|------|-------------|
| `list-soa-versions` | Lists all SoA versions for an assessment: status, framework, approval info, version number. |
| `get-soa-version` | Full details for a specific SoA version: status, framework, scope, approval tracking, metadata. |
| `list-soa-items` | Lists SoA items (control applicability decisions). Filter by `applicability_status`, `implementation_status`, or `evidence_coverage`. |
| `get-soa-item` | Full details of a SoA item: applicability, implementation, evidence, mapping info, rationale, validation notes. |
| `validate-soa` | Validates a SoA for review readiness: checks for `to_be_defined` items, missing rationales, unchecked evidence. |
| `get-soa-summary` | Aggregated statistics: applicability breakdown, implementation breakdown, evidence coverage, pending validations. |

> **Note:** SoA items approved through the approval gate are immutable. Any correction produces a new SoA version.

---

## Gap Analysis & Findings

Review gap analysis results and individual findings produced during the assessment lifecycle.

**Example queries:**

- *"Show me the gap analysis for assessment `a1b2c3d4`"*
- *"List all critical findings for my current assessment"*
- *"Get the details for finding `f9e8d7c6`"*
- *"How many findings are in `open` status?"*

### Tools

| Tool | Description |
|------|-------------|
| `get-gap-analysis` | Returns the approved gap analysis artifact for a given assessment. |
| `list-findings` | Lists all findings for an assessment, with optional severity filter (`critical`, `high`, `medium`, `low`). |
| `get-finding` | Returns full details for a single finding, including SCF control reference and remediation notes. |

> **Note:** Gap analysis output is schema-validated before persistence. Findings marked as `approved` are immutable; corrections produce a new version.

---

## Platform Status

Check real-time platform health and, for admins, active SOC alerts.

**Example queries:**

- *"Is the Standard GRC API healthy?"*
- *"Are there any active SOC alerts right now?"* *(admin only)*

### Tools

| Tool | Description |
|------|-------------|
| `get-platform-health` | Returns the current health status: requests, error rate, latency (1h window). |
| `list-soc-alerts` | **Admin only.** Returns active SOC alerts with severity and timestamp. |

---

## All 33 Tools Reference

| Tool | Category | Required Args |
|------|----------|---------------|
| `list-assessments` | Assessment | — |
| `get-assessment` | Assessment | `assessment_id` |
| `get-assessment-status` | Assessment | `assessment_id` |
| `list-assessment-documents` | Assessment | `assessment_id` |
| `search-scf-controls` | SCF | `query` |
| `get-scf-control` | SCF | `control_id` |
| `list-scf-frameworks` | SCF | — |
| `list-scf-domains` | SCF | — |
| `list-framework-requirements` | SCF | `framework_id` |
| `get-framework-coverage` | SCF | `framework_id` |
| `get-control-mappings` | SCF | `control_id` |
| `cross-framework-mapping` | SCF | `framework_a`, `framework_b` |
| `calculate-blast-radius` | Intelligence | `control_id` |
| `calculate-roi-path` | Intelligence | `target_framework`, `scf_controls_implemented` |
| `calculate-compliance-score` | Intelligence | `regulation_id`, `scf_controls_implemented` |
| `calculate-dpia-score` | Intelligence | `regulation_id` |
| `check-breach-sla` | Intelligence | `regulation_id`, `severity` |
| `calculate-cross-coverage` | Intelligence | `source_framework`, `target_framework`, `scf_controls_implemented` |
| `search-kb` | KB & AI | `assessment_id`, `query` |
| `evaluate-evidence` | KB & AI | `control_requirement`, `evidence_description` |
| `architect-remediation` | KB & AI | `evidence_context` |
| `get-gap-analysis` | Gap | `assessment_id` |
| `list-findings` | Gap | `assessment_id` |
| `get-finding` | Gap | `finding_id` |
| `list-soa-versions` | SoA | `assessment_id` |
| `get-soa-version` | SoA | `soa_version_id` |
| `list-soa-items` | SoA | `soa_version_id` |
| `get-soa-item` | SoA | `soa_item_id` |
| `validate-soa` | SoA | `soa_version_id`, `assessment_id` |
| `get-soa-summary` | SoA | `assessment_id` |
| `get-platform-health` | Platform | — |
| `list-soc-alerts` | Platform | — |

---

## Security

- **Never embed API keys in source code or commit them to version control.** Use environment variables or your client's secret store.
- **Use the minimum required scopes.** For read-only integrations (browsing assessments, searching controls), the `assessments:read` and `scf:read` scopes are sufficient.
- **Each API key is scoped to a single organization.** There is no cross-organization access.
- **Rotate keys regularly** and revoke any key that may have been exposed.
- **Audit log.** Every MCP tool call is recorded in your organization's audit log with timestamp, tool name, actor (key ID), and assessment context.

---

## Troubleshooting

### `401 Unauthorized`

The API key is missing, malformed, or has been revoked.

- Confirm the `Authorization: Bearer <key>` header is present and contains the full key value.
- Regenerate the key in **Settings → API Keys** if needed.

### `403 Forbidden`

The authenticated key does not have the required scope for the tool being called.

- Review the tool's required scope in the [All Tools](#all-27-tools-reference) table.
- Edit the key's scopes or generate a new key with the correct permissions.

### Tool not found / method not found

The tool name in the request does not match any registered tool.

- Tool names use kebab-case: `list-assessments`, not `listAssessments`.
- Verify spelling against the [All Tools](#all-27-tools-reference) table.
- If using `mcp-remote`, ensure the proxy version is up to date: `npx -y mcp-remote@latest`.

### Connection timeout / no response

- Confirm `https://standard-api.bekaa.eu/mcp` is reachable from your network.
- Check the [Platform Status](#platform-status) tool for any ongoing incidents.
- If behind a corporate proxy, configure `mcp-remote` with the appropriate `--proxy` flag.

---

## Related Documentation

- [API Reference](/docs) — Full OpenAPI playground for all REST endpoints
- [GUIDE.md](./GUIDE.md) — REST API developer guide
- [COOKBOOK.md](./COOKBOOK.md) — Essential API call patterns with `curl` examples
- [B2B Integration Guide](./B2B_INTEGRATION_GUIDE.md) — Webhook and server-to-server integrations
- [llms.txt](/llms.txt) — Machine-readable API summary for AI assistants

---

*Standard GRC Platform · MCP endpoint: `POST /mcp` · SSE streaming: `GET /mcp` · 32 tools · API version: v1*
