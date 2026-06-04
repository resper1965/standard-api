---
title: "Standard API — Developer Reference"
---

# Standard API — Developer Reference

> **Base URL:** `https://standard-api.bekaa.eu`
>
> **Version:** v1 — All endpoints are prefixed with `/api/v1`

---

## Overview

**Standard** is an API-first SaaS platform for executing security, compliance, and maturity assessments based on the **Secure Controls Framework (SCF)**. The API covers the full assessment lifecycle — from document ingestion, knowledge base construction, SCF analysis, framework mapping, scope/SoA drafting, Gap Analysis, Maturity Assessment, POA&M planning, to final report generation.

### Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Gateway** | Cloudflare Workers | Edge-deployed REST API |
| **Database** | Neon PostgreSQL | Transactional store for all entities |
| **Storage** | Cloudflare R2 | Document storage, reports, evidences |
| **Vector Search** | Cloudflare Vectorize | Semantic search for knowledge base |
| **AI Gateway** | Cloudflare AI Gateway | LLM orchestration with observability |
| **Async Processing** | Cloudflare Queues | Document ingestion, embeddings, reports |

### Authentication

All protected endpoints require a valid session. Authentication is handled via **Standard Native Auth** session cookies or **API Keys (M2M)**.

| Method | Header | Format |
|--------|--------|--------|
| Browser Session | Cookie | `standard-native-auth.session_token=<token>` |
| API Key (M2M) | `Authorization` | `Bearer standard_live_<key>` |

### Organization Context

Most endpoints require a organization/organization context, sent via header:

```
x-standard-organization-id: <organization_id>
```

This is automatically set from the active organization in the user's session.

### Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description.",
    "details": [],
    "trace_id": "abc123"
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `TENANT_CONTEXT_REQUIRED` | 400 | Missing organization header |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## 1. Health & System

### `GET /health`
Basic health check. No auth required.

### `GET /api/v1/health`
Versioned health check. No auth required.

**Response:**
```json
{ "ok": true, "service": "standard-api-standard", "trace_id": "..." }
```

---

## 2. SCF Catalog (Secure Controls Framework)

The SCF catalog is the normative data layer. All controls, domains, frameworks, requirements, and mappings are version-controlled.

### Versions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/scf/versions` | GET | List all SCF versions |
| `/api/v1/scf/versions/latest` | GET | Get the latest active SCF version |
| `/api/v1/scf/versions/:scfVersionId` | GET | Get a specific SCF version |
| `/api/v1/scf/versions/:scfVersionId/domains` | GET | List SCF domains for a version |
| `/api/v1/scf/versions/:scfVersionId/controls` | GET | Search controls (query params: `control_code`, `domain_code`, `q`, `tags`) |

### Controls & Frameworks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/scf/controls/:controlId` | GET | Get control by ID |
| `/api/v1/scf/controls/by-code/:controlCode` | GET | Get control by code (`?version=<id>`) |
| `/api/v1/scf/controls/:controlId/mappings` | GET | Get framework mappings for control |
| `/api/v1/scf/frameworks` | GET | List all frameworks |
| `/api/v1/scf/frameworks/:frameworkId` | GET | Get framework by ID |
| `/api/v1/scf/frameworks/:frameworkId/requirements` | GET | List framework requirements |
| `/api/v1/scf/frameworks/:frameworkId/coverage` | GET | Get coverage summary (`?scf_version=<id>`) |
| `/api/v1/scf/requirements/:requirementId/mappings` | GET | Get mappings for a requirement |

### Admin — SCF Import

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/v1/admin/scf/import-runs` | POST | Import SCF from structured source | `scf:import` |
| `/api/v1/admin/scf/import-runs` | GET | List import runs | — |
| `/api/v1/admin/scf/import-runs/:importRunId` | GET | Get import run details | — |
| `/api/v1/admin/scf/import-xlsx` | POST | Upload XLSX workbook (multipart) | `scf:import` |
| `/api/v1/admin/scf/import-xlsx/dry-run` | POST | Dry-run XLSX import | `scf:import` |

---

## 3. Multi-Tenancy

### Organizations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/organizations` | GET | List organizations |
| `/api/v1/organizations/:organizationId` | GET | Get organization |
| `/api/v1/organizations/:organizationId` | PUT | Update organization |

### Organizations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/organizations` | GET | List organizations |
| `/api/v1/organizations/:organizationId` | GET | Get organization details |

### API Keys (M2M)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/api-keys` | GET | List API keys |
| `/api/v1/api-keys` | POST | Create API key |
| `/api/v1/api-keys/:keyId` | DELETE | Revoke API key |
| `/api/v1/api-keys/:keyId/rotate` | POST | Rotate API key |

---

## 4. Assessments

The core entity of the assessment lifecycle.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments` | GET | List assessments |
| `/api/v1/assessments` | POST | Create assessment |
| `/api/v1/assessments/:assessmentId` | GET | Get assessment |
| `/api/v1/assessments/:assessmentId` | PATCH | Update assessment |
| `/api/v1/assessments/:assessmentId` | DELETE | Delete assessment |

### Lifecycle States

Assessments transition through these states:

```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready →
framework_selected → scope_drafted → soa_drafted → soa_under_review →
soa_approved → soa_ingested → evidence_analysis_ready →
gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved →
maturity_assessed → maturity_under_review → maturity_approved →
poam_drafted → poam_under_review → poam_approved →
report_generated → closed
```

### Lifecycle Events

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/lifecycle/events` | GET | List lifecycle events |
| `/api/v1/assessments/:assessmentId/lifecycle/transition` | POST | Trigger state transition |

---

## 5. Document Management

Upload, track, and manage client documents that feed the knowledge base.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/documents` | GET | List documents |
| `/api/v1/assessments/:assessmentId/documents` | POST | Upload document (multipart) |
| `/api/v1/documents/:documentId` | GET | Get document metadata |
| `/api/v1/documents/:documentId` | DELETE | Delete document |
| `/api/v1/documents/:documentId/status` | GET | Get processing status |
| `/api/v1/documents/:documentId/chunks` | GET | Get document chunks |
| `/api/v1/documents/:documentId/download` | GET | Download original file |
| `/api/v1/documents/:documentId/reprocess` | POST | Re-ingest document |

---

## 6. Knowledge Base (KB)

Semantic search and evidence retrieval from ingested documents.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/kb/search` | POST | Semantic search across KB |
| `/api/v1/kb/chunks` | GET | List KB chunks |
| `/api/v1/kb/chunks/:chunkId` | GET | Get chunk details |
| `/api/v1/kb/stats` | GET | KB statistics |
| `/api/v1/kb/embeddings/status` | GET | Embedding pipeline status |
| `/api/v1/kb/documents/:documentId/chunks` | GET | Chunks for a document |

### Search Request

```json
{
  "query": "How does the organization handle access control?",
  "assessment_id": "...",
  "top_k": 10,
  "min_score": 0.7
}
```

---

## 7. Scope & Statement of Applicability (SoA)

### Scope

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/scope` | GET | Get assessment scope |
| `/api/v1/assessments/:assessmentId/scope` | POST | Create/update scope |
| `/api/v1/scopes/:scopeId` | GET | Get scope detail |
| `/api/v1/scopes/:scopeId` | PATCH | Update scope |
| `/api/v1/scopes/:scopeId/submit-review` | POST | Submit scope for review |
| `/api/v1/scopes/:scopeId/approve` | POST | Approve scope |

### SoA (Statement of Applicability)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/soa/draft` | POST | Generate SoA draft |
| `/api/v1/assessments/:assessmentId/soa` | GET | List SoA versions |
| `/api/v1/soa/:soaVersionId` | GET | Get SoA version |
| `/api/v1/soa/:soaVersionId/items` | GET | List SoA items |
| `/api/v1/soa/items/:soaItemId` | PATCH | Update SoA item |
| `/api/v1/soa/:soaVersionId/submit-review` | POST | Submit for review |
| `/api/v1/soa/:soaVersionId/approve` | POST | Approve SoA |
| `/api/v1/soa/:soaVersionId/evidence/refresh` | POST | Refresh evidence links |
| `/api/v1/soa/:soaVersionId/validation` | GET | Validate SoA integrity |
| `/api/v1/soa/:soaVersionId/regenerate` | POST | Regenerate SoA |

---

## 8. Gap Analysis

Identify control gaps between the SoA and evidence.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/gap-analysis/draft` | POST | Generate gap analysis draft |
| `/api/v1/assessments/:assessmentId/gap-analysis` | GET | List gap analysis versions |
| `/api/v1/gap-analysis/:gapVersionId` | GET | Get gap version |
| `/api/v1/gap-analysis/:gapVersionId/findings` | GET | List gap findings |
| `/api/v1/gap-analysis/findings/:findingId` | PATCH | Update finding |
| `/api/v1/gap-analysis/:gapVersionId/submit-review` | POST | Submit for review |
| `/api/v1/gap-analysis/:gapVersionId/approve` | POST | Approve gap analysis |
| `/api/v1/gap-analysis/:gapVersionId/summary` | GET | Get summary statistics |
| `/api/v1/gap-analysis/:gapVersionId/regenerate` | POST | Regenerate gap analysis |

---

## 9. POA&M (Plan of Action & Milestones)

Remediation planning based on gap findings.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/poam/draft` | POST | Generate POA&M draft |
| `/api/v1/assessments/:assessmentId/poam` | GET | List POA&M versions |
| `/api/v1/poam/:poamVersionId` | GET | Get POA&M version |
| `/api/v1/poam/:poamVersionId/items` | GET | List POA&M items |
| `/api/v1/poam/items/:poamItemId` | PATCH | Update item |
| `/api/v1/poam/:poamVersionId/submit-review` | POST | Submit for review |
| `/api/v1/poam/:poamVersionId/approve` | POST | Approve POA&M |
| `/api/v1/poam/:poamVersionId/summary` | GET | Summary statistics |

---

## 10. Reports

Generate and export assessment reports in various formats.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/reports` | GET | List generated reports |
| `/api/v1/assessments/:assessmentId/reports/generate` | POST | Generate report |
| `/api/v1/reports/:reportId` | GET | Get report metadata |
| `/api/v1/reports/:reportId/download` | GET | Download report file |
| `/api/v1/reports/:reportId/render` | GET | Render report HTML |
| `/api/v1/assessments/:assessmentId/reports/executive-summary` | GET | Executive summary |

---

## 11. Approvals

Human-in-the-loop approval gates for critical lifecycle transitions.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/approvals` | GET | List approvals |
| `/api/v1/approvals/:approvalId` | GET | Get approval |
| `/api/v1/approvals/:approvalId/approve` | POST | Approve |
| `/api/v1/approvals/:approvalId/reject` | POST | Reject with reason |

---

## 12. Artifacts

Versioned artifacts produced during the assessment lifecycle.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/artifacts` | GET | List artifacts |
| `/api/v1/artifacts/:artifactId` | GET | Get artifact |
| `/api/v1/artifacts/:artifactId/versions` | GET | List artifact versions |
| `/api/v1/artifacts/:artifactId/versions/:versionNumber` | GET | Get specific version |

---

## 13. Agent Runtime (Agentic Assessment)

Orchestrate AI agents for automated assessment analysis.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/agent-runs` | GET | List agent runs |
| `/api/v1/agent-runs` | POST | Start agent run |
| `/api/v1/agent-runs/:agentRunId` | GET | Get run status |
| `/api/v1/agent-runs/:agentRunId/cancel` | POST | Cancel run |
| `/api/v1/agent-runs/:agentRunId/output` | GET | Get run output |
| `/api/v1/agent-runs/:agentRunId/steps` | GET | Get execution steps |

### Agent Types

| Agent | Purpose |
|-------|---------|
| `knowledge-steward` | Organize KB and evidences |
| `scf-control-analyst` | Analyze controls |
| `framework-mapper` | Consult SCF mappings |
| `scope-soa-architect` | Propose scope/SoA |
| `evidence-analyst` | Classify evidences |
| `gap-analyst` | Propose gaps |
| `maturity-assessor` | Suggest maturity levels |
| `poam-planner` | Propose remediation |
| `report-writer` | Generate reports |

---

## 14. Workflows (Durable Orchestration)

Cloudflare Workflows for durable lifecycle orchestration.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assessments/:assessmentId/workflows/lifecycle/start` | POST | Start lifecycle workflow |
| `/api/v1/assessments/:assessmentId/workflows/lifecycle` | GET | Get workflow status |
| `/api/v1/workflows/:workflowRunId` | GET | Get workflow run |
| `/api/v1/workflows/:workflowRunId/cancel` | POST | Cancel workflow |
| `/api/v1/workflows/:workflowRunId/resume` | POST | Resume workflow |
| `/api/v1/workflows/:workflowRunId/signals` | POST | Send signal to workflow |

---

## 15. Observability

Monitoring, metrics, and audit logging.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/observability/metrics` | GET | Get platform metrics |
| `/api/v1/observability/audit` | GET | Get audit events |
| `/api/v1/observability/alerts` | GET | List alert rules |
| `/api/v1/observability/alerts` | POST | Create alert rule |
| `/api/v1/observability/health` | GET | Detailed service health |

---

## 16. Webhooks

Configure event-driven integrations.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/organizations/:orgId/webhooks` | GET | List webhooks |
| `/api/v1/organizations/:orgId/webhooks` | POST | Create webhook |
| `/api/v1/webhooks/:webhookId` | GET | Get webhook |
| `/api/v1/webhooks/:webhookId` | PATCH | Update webhook |
| `/api/v1/webhooks/:webhookId` | DELETE | Delete webhook |
| `/api/v1/webhooks/:webhookId/deliveries` | GET | List delivery attempts |

---

## 17. Integrations

External service integrations.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations` | GET | List integrations |
| `/api/v1/integrations` | POST | Create integration |
| `/api/v1/integrations/:integrationId` | GET | Get integration |
| `/api/v1/integrations/:integrationId` | PATCH | Update integration |
| `/api/v1/integrations/:integrationId` | DELETE | Delete integration |

---

## 18. Email Templates

Transactional email configuration.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/email/send` | POST | Send transactional email |
| `/api/v1/email/templates` | GET | List email templates |
| `/api/v1/email/templates/:templateId` | GET | Get template |
| `/api/v1/email/templates/:templateId` | PUT | Update template |

---

## Rate Limits

| Route Category | Max Requests | Window |
|----------------|-------------|--------|
| `/documents` | 30 | 60s |
| `/kb/search` | 60 | 60s |
| `/agent-runs` | 10 | 60s |
| `/render` | 20 | 60s |
| `/admin/` | 15 | 60s |
| Default (all others) | 120 | 60s |

---

## CORS

Allowed origins:
- `https://standard.bekaa.eu`
- `https://standard-web.pages.dev`
- `http://localhost:5173`

Allowed headers: `Content-Type`, `Authorization`, `X-Trace-Id`, `X-Organization-Id`, `x-standard-organization-id`

---

## Quick Start (M2M / API Key)

```bash
# 1. Get an API key from the admin panel

# 2. List SCF frameworks
curl -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-organization-id: YOUR_ORG_ID" \
     https://standard-api.bekaa.eu/api/v1/scf/frameworks

# 3. Create an assessment
curl -X POST \
     -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-organization-id: YOUR_ORG_ID" \
     -H "Content-Type: application/json" \
     -d '{"name": "ISO 27001 Assessment", "scf_version_id": "..."}' \
     https://standard-api.bekaa.eu/api/v1/assessments

# 4. Upload a document
curl -X POST \
     -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-organization-id: YOUR_ORG_ID" \
     -F "file=@policy.pdf" \
     https://standard-api.bekaa.eu/api/v1/assessments/ASSESSMENT_ID/documents
```

---

*Standard API v1 • Built on Cloudflare Workers • SCF 2026.1.1*
