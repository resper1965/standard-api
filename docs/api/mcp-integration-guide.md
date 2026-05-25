# Standard GRC MCP Integration Guide

> Connect AI assistants to your GRC assessments, SCF controls and compliance findings through the Model Context Protocol.

The Standard GRC Platform exposes a **Model Context Protocol (MCP)** endpoint that lets any compatible AI assistant — Claude, Cursor, Windsurf, VS Code Copilot, and others — interact directly with your assessments, SCF control catalog, gap analysis findings, and platform health data.

---

## Getting Started

### Step 1: Generate your API Key

1. Log in to your Standard GRC dashboard.
2. Navigate to **Settings → API Keys**.
3. Click **Create API Key** and choose a descriptive name (e.g. `mcp-claude-desktop`).
4. Select the required **scopes** — at minimum `assessments:read` and `scf:read`.
5. Click **Generate**. Copy the key immediately — it will not be shown again.

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
        "Authorization: Bearer <your-api-key>"
      ]
    }
  }
}
```

Replace `<your-api-key>` with the key you generated in Step 1.

> **Note:** The MCP endpoint supports both HTTP GET (SSE streaming) and HTTP POST (standard JSON-RPC). The `mcp-remote` proxy handles protocol negotiation automatically.

---

### Step 3: Test your connection

After saving the configuration and restarting your MCP client, try the following natural language queries:

- *"List all my active assessments"*
- *"What SCF controls apply to ISO 27001?"*
- *"Show me critical findings for assessment `<id>`"*
- *"What's the platform health status?"*

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
| `get-assessment` | Returns full details of a single assessment, including lifecycle state, framework, and tenant metadata. |
| `get-assessment-status` | Returns the current lifecycle state and last-updated timestamp for a given assessment. |
| `list-assessment-documents` | Lists all documents uploaded as evidence for a given assessment. |

---

## SCF Catalog

Browse and search the Secure Controls Framework catalog — the normative source of truth for all control mappings in Standard GRC.

**Example queries:**

- *"Find SCF controls related to access control"*
- *"What does control `IAC-01` require?"*
- *"List all frameworks available in the SCF catalog"*
- *"Which SCF controls map to SOC 2 CC6.1?"*

### Tools

| Tool | Description |
|------|-------------|
| `search-scf-controls` | Full-text and semantic search over the SCF control catalog. Accepts a query string and optional domain filter. |
| `get-scf-control` | Returns full details for a single SCF control, including description, objectives, mappings, and SCF version. |
| `list-scf-frameworks` | Lists all frameworks supported by the SCF catalog (ISO 27001, SOC 2, NIST CSF, LGPD, etc.). |

> **Important:** The SCF catalog reflects only official mappings present in the versioned SCF base. The assistant will not invent crosswalks or mappings that do not exist in the structured data.

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
| `get-gap-analysis` | Returns the approved gap analysis artifact for a given assessment, including summary statistics and SCF version. |
| `list-findings` | Lists all findings for an assessment, with optional filters for severity (`critical`, `high`, `medium`, `low`) and status (`open`, `accepted`, `remediated`). |
| `get-finding` | Returns full details for a single finding, including SCF control reference, evidence summary, and remediation notes. |

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
| `get-platform-health` | Returns the current health status of the API, database, queue, and storage subsystems. |
| `list-soc-alerts` | **Admin only.** Returns active SOC alerts with severity and timestamp. Requires `soc:read` scope. |

---

## Available Tools

Complete reference of all 12 MCP tools exposed by the Standard GRC Platform.

| Tool | Description | Required Args |
|------|-------------|---------------|
| `list-assessments` | List assessments for the authenticated organization | — |
| `get-assessment` | Get full assessment details | `assessment_id` |
| `get-assessment-status` | Get current lifecycle state of an assessment | `assessment_id` |
| `list-assessment-documents` | List evidence documents for an assessment | `assessment_id` |
| `search-scf-controls` | Search SCF controls by keyword or domain | `query` |
| `get-scf-control` | Get full details for a single SCF control | `control_id` |
| `list-scf-frameworks` | List all SCF-supported compliance frameworks | — |
| `get-gap-analysis` | Get approved gap analysis for an assessment | `assessment_id` |
| `list-findings` | List findings for an assessment | `assessment_id` |
| `get-finding` | Get full details for a single finding | `finding_id` |
| `get-platform-health` | Get real-time platform health status | — |
| `list-soc-alerts` | List active SOC alerts *(admin only)* | — |

---

## Security

- **Never embed API keys in source code or commit them to version control.** Use environment variables or your client's secret store.
- **Use the minimum required scopes.** For read-only integrations (browsing assessments, searching controls), the `assessments:read` and `scf:read` scopes are sufficient. Only request `soc:read` if you need SOC alert access.
- **Each API key is scoped to a single tenant.** There is no cross-tenant access — a key belonging to Tenant A cannot read data from Tenant B.
- **Rotate keys regularly** and revoke any key that may have been exposed.
- **Audit log.** Every MCP tool call is recorded in your tenant's audit log with timestamp, tool name, actor (key ID), and assessment context.

---

## Troubleshooting

### `401 Unauthorized`

The API key is missing, malformed, or has been revoked.

- Confirm the `Authorization: Bearer <key>` header is present and contains the full key value.
- Regenerate the key in **Settings → API Keys** if needed.

### `403 Forbidden`

The authenticated key does not have the required scope for the tool being called.

- Review the tool's required scope in the [Available Tools](#available-tools) table.
- Edit the key's scopes in **Settings → API Keys** or generate a new key with the correct permissions.

### Tool not found / method not found

The tool name in the request does not match any registered tool.

- Tool names use kebab-case: `list-assessments`, not `listAssessments`.
- Verify spelling against the [Available Tools](#available-tools) table.
- If using `mcp-remote`, ensure the proxy version is up to date: `npx -y mcp-remote@latest`.

### Connection timeout / no response

- Confirm `https://standard-api.bekaa.eu/mcp` is reachable from your network.
- Check the [Platform Status](#platform-status) tool for any ongoing incidents.
- If behind a corporate proxy, configure `mcp-remote` with the appropriate `--proxy` flag.

---

## Related Documentation

- [API Reference](/docs) — Full OpenAPI playground for all REST endpoints
- [GUIDE.md](./GUIDE.md) — REST API developer guide
- [B2B Integration Guide](./B2B_INTEGRATION_GUIDE.md) — Webhook and server-to-server integrations
- [llms.txt](/llms.txt) — Machine-readable API summary for AI assistants

---

*Standard GRC Platform · MCP endpoint: `POST /mcp` · SSE streaming: `GET /mcp` · API version: v1*
