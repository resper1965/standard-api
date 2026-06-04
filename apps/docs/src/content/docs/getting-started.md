---
title: "Getting Started with Standard API"
---

# Getting Started with Standard API

> 🔗 **[Interactive API Explorer →](https://standard-api.bekaa.eu/docs)** — Try endpoints directly in your browser

## What is Standard?

Standard is a **compliance assessment API** that automates security framework evaluations (SOC 2, ISO 27001, HIPAA, NIST, and 231+ frameworks). You upload your security documents, and Standard's AI agents analyze them against the Secure Controls Framework to produce gap analyses, maturity scores, remediation plans, and audit-ready reports.

**Your application calls the API — Standard does the compliance intelligence.**

## Who is this for?

- **GRC SaaS products** that need compliance data in their apps
- **Security consultancies** automating assessment workflows  
- **Enterprise security teams** building custom compliance dashboards

## What Can I Ask the API?

| I want to... | Endpoint | I get back... |
|---|---|---|
| **See all compliance frameworks** (ISO 27001, SOC 2, HIPAA...) | `GET /api/v1/scf/frameworks` | 231 frameworks with requirement counts |
| **Get controls for a framework** | `GET /api/v1/scf/frameworks/{id}/requirements` | Every requirement mapped to SCF controls |
| **Look up a specific control** (e.g. GOV-01) | `GET /api/v1/scf/controls/by-code/GOV-01` | Control description, methods, domain |
| **See cross-framework mappings** | `GET /api/v1/scf/controls/{id}/mappings` | Which ISO/NIST/SOC 2 requirements map to this control |
| **Compare two frameworks** | `GET /api/v1/scf/cross-mapping/{fwA}/{fwB}` | Overlap %, shared controls, interpretation |
| **Get framework coverage** | `GET /api/v1/scf/frameworks/{id}/coverage` | SCF control coverage summary |
| **Start a compliance assessment** | `POST /api/v1/assessments` | Assessment ID + lifecycle state |
| **Upload security docs for analysis** | `POST /api/v1/assessments/{id}/documents` | Document registered for AI ingestion |
| **Check assessment progress** | `GET /api/v1/assessments/{id}/status` | Current lifecycle state (1 of 25) |
| **See what I can do next** | `GET /api/v1/assessments/{id}/available-transitions` | List of valid next states |
| **Generate a Statement of Applicability** | `POST /api/v1/assessments/{id}/soa/draft` | SoA version with controls in/out of scope |
| **Get gap analysis findings** | `GET /api/v1/assessments/{id}/gap-analysis` | Findings with severity, evidence refs, remediation |
| **Get maturity scores** | `GET /api/v1/assessments/{id}/maturity` | Per-domain maturity levels (1-5 scale) |
| **🎯 Project compliance against ANY framework** | `GET /api/v1/assessments/{id}/projection/{fwId}` | Compliance %, per-requirement status, zero re-assessment |
| **Generate remediation plan (PoA&M)** | `GET /api/v1/assessments/{id}/poam` | Prioritized remediation items with deadlines |
| **Generate audit-ready report** | `POST /api/v1/assessments/{id}/reports/draft` | DOCX/JSON report with full traceability |
| **Search evidence by meaning** | `POST /api/v1/assessments/{id}/kb/search` | Semantically matched document chunks |
| **View full audit trail** | `GET /api/v1/audit-events` | Every action taken, by whom, when |
| **List privacy regulations** (LGPD, GDPR, HIPAA) | `GET /api/v1/regulations` | Regulations with right counts, penalties |
| **Get legal bases for a regulation** | `GET /api/v1/regulations/{id}/legal-bases` | Legal bases with LIA requirements |
| **Get data subject rights** | `GET /api/v1/regulations/{id}/rights` | Rights with SLA deadlines |
| **Get breach notification rules** | `GET /api/v1/regulations/{id}/breach-rules` | Authority deadlines, required fields |
| **Get international transfer mechanisms** | `GET /api/v1/regulations/{id}/transfer-mechanisms` | Mechanisms + DPA requirements |
| **List risk methodologies** | `GET /api/v1/risk/methodologies` | ISO 31000, NIST 800-30 |
| **Get full risk methodology** | `GET /api/v1/risk/methodologies/{id}` | Scales, matrix, treatment options |
| **Browse risk taxonomy** | `GET /api/v1/risk/taxonomy` | Categories, subcategories, control mappings |
| **Get KRI library** | `GET /api/v1/risk/kri-library` | KRI templates with thresholds and formulas |

### 📘 Recipes (End-to-End Guides)

| Use Case | Recipe |
|---|---|
| **Upload docs → Gap Analysis against ISO 27001** | [iso27001-gap-analysis.md](../examples/recipes/iso27001-gap-analysis.md) |
| **Compare two frameworks (e.g. ISO 27001 vs SOC 2)** | [cross-framework-comparison.md](../examples/recipes/cross-framework-comparison.md) |
| **Automate privacy compliance (LGPD/GDPR)** | [privacy-compliance-automation.md](../examples/recipes/privacy-compliance-automation.md) |
| **Set up risk assessment with KRI monitoring** | [risk-assessment-setup.md](../examples/recipes/risk-assessment-setup.md) |

## Authentication

All API calls require authentication. Standard supports two methods:

### Option A: Bearer Token (Interactive Users)

```bash
# After onboarding, your users authenticate via the web UI
# The session token is returned in the cookie/header
Authorization: Bearer <session-token>
```

### Option B: API Key (Machine-to-Machine)

```bash
# API keys are provisioned during onboarding
# Use the X-Standard-Api-Key header or Authorization: ApiKey
Authorization: ApiKey sk-your-api-key-here
```

> **Note:** API keys are always scoped to a single organization. Contact support to provision keys for your organization.

## Base URL

```
Production: https://standard-api.bekaa.eu
```

All endpoints are prefixed with `/api/v1`.

## Your First API Call

### 1. Health Check (no auth required)

```bash
curl https://standard-api.bekaa.eu/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-14T17:00:00.000Z",
  "services": {
    "database": "ok",
    "r2": "ok",
    "vectorize": "ok"
  }
}
```

### 2. List Available Frameworks

See what compliance frameworks are available:

```bash
curl -H "Authorization: ApiKey sk-your-key" \
  https://standard-api.bekaa.eu/api/v1/scf/frameworks
```

Response (abbreviated):
```json
{
  "data": [
    { "id": "...", "name": "ISO 27001:2022", "requirement_count": 142 },
    { "id": "...", "name": "SOC 2 Type II", "requirement_count": 64 },
    { "id": "...", "name": "NIST CSF 2.0", "requirement_count": 108 },
    { "id": "...", "name": "HIPAA Security Rule", "requirement_count": 75 }
  ],
  "page": { "limit": 50, "has_more": true },
  "trace_id": "trace-abc123"
}
```

## Complete Assessment Flow (10 Steps)

Here's the full happy path from start to finished report:

```
1. Create Assessment ──→ draft
2. Upload Documents ──→ documents_uploaded
3. Select Framework ──→ framework_selected  
4. Draft SoA ──→ soa_drafted
5. Approve SoA ──→ soa_approved
6. Run Evidence Analysis ──→ evidence_analyzed
7. Generate Gap Analysis ──→ gap_analysis_complete
8. Run Maturity Scoring ──→ maturity_scored
9. Generate PoA&M ──→ poam_generated
10. Generate Report ──→ report_generated → closed
```

### Step 1: Create an Assessment

```bash
curl -X POST \
  -H "Authorization: ApiKey sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-org-id",
    "name": "Q2 2026 ISO 27001 Assessment",
    "scf_version_id": "your-scf-version-id"
  }' \
  https://standard-api.bekaa.eu/api/v1/assessments
```

Response:
```json
{
  "assessment_id": "assess-uuid-here",
  "state": "draft",
  "name": "Q2 2026 ISO 27001 Assessment",
  "trace_id": "trace-xyz789"
}
```

### Step 2: Upload a Document

```bash
curl -X POST \
  -H "Authorization: ApiKey sk-your-key" \
  -F "file=@./information-security-policy.pdf" \
  -F "description=Corporate InfoSec Policy v3.1" \
  https://standard-api.bekaa.eu/api/v1/assessments/{assessmentId}/documents
```

### Step 3: Transition to Next State

```bash
curl -X POST \
  -H "Authorization: ApiKey sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{ "next_state": "documents_uploaded" }' \
  https://standard-api.bekaa.eu/api/v1/assessments/{assessmentId}/transitions
```

> **Tip:** Call `GET /api/v1/assessments/{id}/available-transitions` to see what states you can transition to.

### Step 4–10: Continue the Lifecycle

Each step follows the same pattern:
1. Perform the action (draft SoA, run analysis, etc.)
2. Submit for review where required
3. Approve via the approvals endpoint
4. Transition to the next state

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Assessment name is required.",
    "details": ["field 'name' is missing"],
    "trace_id": "trace-error-001"
  }
}
```

| Status Code | Meaning |
|---|---|
| `400` | Invalid request body or parameters |
| `401` | Missing or invalid authentication |
| `403` | Insufficient permissions for this action |
| `404` | Resource not found (or organization boundary) |
| `409` | State conflict (e.g., wrong lifecycle state) |
| `429` | Rate limit exceeded |
| `500` | Internal server error (include `trace_id` in support ticket) |

## Rate Limits

| Tier | Requests/minute |
|---|---|
| Free | 30 |
| Starter | 100 |
| Business | 500 |
| Enterprise | 2,000 |

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1715680000
```

## AI-Assisted Development

Building your integration with **Cursor, Claude Code, Antigravity, GitHub Copilot**, or similar? Standard is built for AI-first development workflows.

### Option 1: Drop-in Context File (Recommended)

Copy [`examples/ai-context/STANDARD_API.md`](../examples/ai-context/STANDARD_API.md) into your project:

```bash
# For Cursor
cp STANDARD_API.md your-project/.cursor/rules/standard-api.md

# For Claude Code
cp STANDARD_API.md your-project/.claude/standard-api.md

# For Antigravity / generic agents
cp STANDARD_API.md your-project/.agents/skills/standard-api/SKILL.md
```

Your AI assistant will now understand the full API — endpoints, auth, lifecycle, error formats — and generate correct integration code without you reading a single doc page.

### Option 2: LLM Context URLs

Point your AI tool at these URLs for live, always-current API context:

| URL | Purpose |
|---|---|
| [`/llms.txt`](https://standard-api.bekaa.eu/llms.txt) | Compact summary for AI assistants |
| [`/llms-full.txt`](https://standard-api.bekaa.eu/llms-full.txt) | Complete API context in a single file |
| [`/docs/openapi.json`](https://standard-api.bekaa.eu/docs/openapi.json) | Machine-readable OpenAPI 3.1 spec |

### Option 3: Context7

If your AI tool supports [Context7](https://context7.com), the Standard API documentation is available as a resolvable library for automatic context fetching.

### Option 4: Model Context Protocol (MCP) Server

Connect your AI assistants (like Claude Desktop or Cursor) directly to the Standard GRC platform using our native MCP server. See the [MCP Server Setup Guide](./guides/mcp-server-setup.md) for installation and configuration instructions.

## API Reference

- 🔗 **[Interactive API Explorer](https://standard-api.bekaa.eu/docs)** — Scalar-powered, try endpoints in-browser
- 📄 **[OpenAPI JSON](https://standard-api.bekaa.eu/docs/openapi.json)** — Machine-readable spec
- 📖 **[Cookbook](https://standard-api.bekaa.eu/docs/cookbook)** — End-to-end recipes
- 🔌 **[MCP Guide](./guides/mcp-server-setup.md)** — Connect your AI tools to the GRC catalog
- 🤖 **[LLM Context](https://standard-api.bekaa.eu/llms.txt)** — Full API context for AI assistants

## Support

- **Security issues:** See [SECURITY.md](../SECURITY.md)
- **Production endpoint:** [standard.bekaa.eu](https://standard.bekaa.eu)
- **Status page:** `GET /health`
