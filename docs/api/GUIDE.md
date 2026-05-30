# Standard SCF Platform — Functional Guide

> Build compliance assessments powered by the Secure Controls Framework (SCF).

Standard is an API-first SaaS platform that provides the data infrastructure for security, compliance, and maturity assessments. It ingests your organization's documents, maps them against internationally recognized frameworks through the SCF, identifies compliance gaps, and generates actionable remediation plans.

---

## What Standard Does

Standard automates the compliance assessment lifecycle:

1. **You upload documents** — policies, procedures, controls evidence
2. **Standard ingests and indexes them** — creating a semantic knowledge base
3. **The SCF catalog identifies applicable controls** — 1,468 controls across 231 frameworks
4. **Gap analysis finds what's missing** — comparing your evidence to expected controls
5. **Maturity assessment rates your posture** — from initial to optimized
6. **POA&M plans the remediation** — prioritized actions with milestones
7. **Reports are generated** — executive summaries, detailed findings, audit-ready exports

Everything runs through a single REST API. Your application controls the analysis — Standard provides the structured data, lifecycle orchestration, and compliance intelligence.

---

## Core Concepts

### SCF (Secure Controls Framework)

The SCF is the normative backbone. It provides a unified taxonomy of security and privacy controls, with official crosswalk mappings to 231+ regulatory frameworks (ISO 27001, NIST CSF, SOC 2, LGPD, GDPR, HIPAA, PCI DSS, etc.).

Standard ships with the full SCF 2026.1.1 dataset:

| Entity | Count | Description |
|--------|-------|-------------|
| Controls | 1,468 | Security/privacy control practices (e.g., GOV-01, IAC-15) |
| Frameworks | 231 | Regulatory and industry standards |
| Requirements | 32,903 | Framework-specific mandates |
| Mappings | 15,717 | Official SCF crosswalk links |
| Domains | 33 | Logical groupings (Governance, Access Control, etc.) |

### Assessments

An assessment is the central entity. It represents a compliance evaluation for an organization against one or more frameworks.

Assessments follow a strict lifecycle with human approval gates:

```
draft → documents_uploaded → documents_ingested →
scf_pre_analysis_ready → framework_selected →
scope_drafted → soa_drafted → soa_approved →
gap_analysis_drafted → gap_analysis_approved →
maturity_assessed → maturity_approved →
poam_drafted → poam_approved →
report_generated → closed
```

### Organizations & Multi-Tenancy

Every API call is scoped to an organization (tenant). Data isolation is enforced at every layer — database queries, storage paths, vector namespaces, and logs.

### Knowledge Base (KB)

When documents are uploaded, they're parsed, chunked, and embedded into a vector store. The KB enables semantic search: "How does the organization handle incident response?" returns the most relevant document passages with source attribution.

### Approval Gates

Critical lifecycle transitions require human approval. The SoA, Gap Analysis, Maturity Assessment, and POA&M cannot be finalized without an explicit approval decision.

---

## How to Use the API

### Authentication

Two methods:

| Method | Use Case | How |
|--------|----------|-----|
| **Session** | Browser/interactive | Cookie-based via Standard Native Auth |
| **API Key** | Machine-to-machine | `Authorization: Bearer standard_live_...` |

### Tenant Context

All requests must include the organization scope:

```
x-standard-tenant-id: <organization_id>
```

### Typical Integration Flow

```
1. GET  /api/v1/scf/versions/latest          → Get the active SCF version
2. GET  /api/v1/scf/frameworks               → Browse available frameworks
3. POST /api/v1/assessments                   → Create an assessment
4. POST /api/v1/assessments/:id/documents     → Upload evidence documents
5. POST /api/v1/kb/search                     → Search the knowledge base
6. GET  /api/v1/scf/controls/:id/mappings     → Get crosswalk mappings
7. POST /api/v1/assessments/:id/soa/draft     → Generate Statement of Applicability
8. POST /api/v1/assessments/:id/gap-analysis/draft → Generate gap analysis
9. POST /api/v1/approvals/:id/approve         → Approve findings
10. POST /api/v1/assessments/:id/reports/generate → Generate final report
11. GET  /api/v1/reports/:id/download          → Download report
```

---

## API Endpoint Groups

### SCF Catalog (Read-Only)

Query the full SCF dataset — controls, domains, frameworks, requirements, and crosswalk mappings.

```
GET  /api/v1/scf/versions/latest
GET  /api/v1/scf/versions/:id/controls?q=access+control
GET  /api/v1/scf/frameworks
GET  /api/v1/scf/frameworks/:id/requirements
GET  /api/v1/scf/controls/:id/mappings
GET  /api/v1/scf/frameworks/:id/coverage
```

### Assessments

Full CRUD for compliance assessments.

```
GET    /api/v1/assessments
POST   /api/v1/assessments
GET    /api/v1/assessments/:id
PATCH  /api/v1/assessments/:id
DELETE /api/v1/assessments/:id
```

### Documents

Upload and manage client evidence documents. Documents are parsed, chunked, and indexed automatically.

```
POST   /api/v1/assessments/:id/documents    (multipart/form-data)
GET    /api/v1/assessments/:id/documents
GET    /api/v1/documents/:id/status
GET    /api/v1/documents/:id/chunks
GET    /api/v1/documents/:id/download
POST   /api/v1/documents/:id/reprocess
```

### Knowledge Base

Semantic search across all ingested evidence.

```
POST   /api/v1/kb/search         { "query": "...", "top_k": 10 }
GET    /api/v1/kb/stats
GET    /api/v1/kb/chunks/:id
```

### Scope & Statement of Applicability (SoA)

Define what's in scope and generate the SoA — the cornerstone of every compliance assessment.

```
POST   /api/v1/assessments/:id/scope
POST   /api/v1/assessments/:id/soa/draft
GET    /api/v1/soa/:versionId/items
PATCH  /api/v1/soa/items/:itemId
POST   /api/v1/soa/:versionId/approve
```

### Gap Analysis

Identify control gaps between the SoA and available evidence.

```
POST   /api/v1/assessments/:id/gap-analysis/draft
GET    /api/v1/gap-analysis/:versionId/findings
PATCH  /api/v1/gap-analysis/findings/:findingId
POST   /api/v1/gap-analysis/:versionId/approve
GET    /api/v1/gap-analysis/:versionId/summary
```

### POA&M (Plan of Action & Milestones)

Remediation planning based on identified gaps.

```
POST   /api/v1/assessments/:id/poam/draft
GET    /api/v1/poam/:versionId/items
PATCH  /api/v1/poam/items/:itemId
POST   /api/v1/poam/:versionId/approve
```

### Reports

Generate and export assessment reports.

```
POST   /api/v1/assessments/:id/reports/generate
GET    /api/v1/reports/:id/download
GET    /api/v1/assessments/:id/reports/executive-summary
```

### Approvals

Human-in-the-loop approval gates for critical outputs.

```
GET    /api/v1/assessments/:id/approvals
POST   /api/v1/approvals/:id/approve
POST   /api/v1/approvals/:id/reject
```

### Lifecycle & Workflows

Manage assessment state transitions and durable orchestration.

```
POST   /api/v1/assessments/:id/lifecycle/transition
GET    /api/v1/assessments/:id/lifecycle/events
POST   /api/v1/assessments/:id/workflows/lifecycle/start
GET    /api/v1/workflows/:runId
```

### Agent Runtime

Monitor AI agent execution for automated analysis.

```
GET    /api/v1/agent-runtime/agents
POST   /api/v1/assessments/:id/agent-runs
GET    /api/v1/assessments/:id/agent-runs
GET    /api/v1/agent-runs/:id
POST   /api/v1/agent-runs/:id/complete
```

---

## AI Agents

Standard ships with 7 specialized AI agents that power the automated analysis pipeline. Each agent runs on `gpt-4o` with structured output via JSON Schema, producing deterministic, audit-grade results.

| Agent | Endpoint | Purpose | Max Tokens |
|-------|----------|---------|------------|
| **Evidence Evaluator** | `POST /api/v1/gap/evaluate-evidence` | Evaluates technical evidence against control requirements | 500 |
| **Incident Triager** | `POST /api/v1/soc/triage-incident` | Classifies security logs as false positives or real incidents | 800 |
| **Board Translator** | `POST /api/v1/executive/translate-risk` | Translates technical risks into C-Level language | 700 |
| **Vendor Scanner** | `POST /api/v1/privacy/scan-vendor-contract` | Analyzes vendor contracts for LGPD/GDPR compliance gaps | 1000 |
| **PoAM Architect** | `POST /api/v1/poam/architect-remediation` | Creates sprint-ready remediation plans from failed gaps | 800 |
| **RoPA Analyzer** | `POST /api/v1/privacy/analyze-ropa` | Deduces controls, risk level, and legal basis from data processing descriptions | 600 |
| **DPIA Assessor** | `POST /api/v1/privacy/assess-dpia` | Produces deep residual risk assessments with conditional technical approval | 700 |

### Agent Run Lifecycle

```
┌───────────┐     ┌──────────┐     ┌───────────┐
│  pending   │ ──▶ │ running  │ ──▶ │ completed │
└───────────┘     └──────────┘     └───────────┘
                        │
                        ▼
                   ┌──────────┐
                   │  failed  │
                   └──────────┘
```

### Example: Evaluate Evidence (curl)

```bash
curl -X POST \
     -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-tenant-id: YOUR_ORG_ID" \
     -H "Content-Type: application/json" \
     -d '{
       "controlRequirement": "Backup data must be stored at rest with AES-256 encryption.",
       "evidenceDescription": "Our AWS S3 buckets use SSE-S3 with AES-256 by default."
     }' \
     https://standard-api.bekaa.eu/api/v1/gap/evaluate-evidence
```

**Response:**

```json
{
  "is_compliant": true,
  "confidence_score": 85,
  "missing_elements": ["Key rotation policy not documented"],
  "auditor_notes": "SSE-S3 provides AES-256 at rest. Recommend documenting key rotation policy for full compliance."
}
```

### Example: TypeScript SDK

```typescript
import { apiClient } from "./lib/api";

// 1. Evaluate evidence against a control
const evaluation = await apiClient("/api/v1/gap/evaluate-evidence", {
  method: "POST",
  body: JSON.stringify({
    controlRequirement: "Multi-factor authentication must be enforced for all admin accounts.",
    evidenceDescription: "We use AWS IAM with MFA enforced via SCP for the AdminAccess policy group."
  })
});

if (!evaluation.is_compliant) {
  // 2. Generate remediation plan
  const remediation = await apiClient("/api/v1/poam/architect-remediation", {
    method: "POST",
    body: JSON.stringify({
      evidenceContext: evaluation,
      systemArchitectureDescription: "AWS Organizations with centralized IAM and SSO."
    })
  });

  console.log("Sprint items:", remediation.sprint_action_items);
  console.log("Commands:", remediation.devops_commands_suggested);
}

// 3. Translate risk for the board
const boardReport = await apiClient("/api/v1/executive/translate-risk", {
  method: "POST",
  body: JSON.stringify({
    technicalRiskDescription: "CVE-2024-1234 allows RCE on unpatched Kubernetes API server.",
    riskCategory: "security",
    businessContext: "Production cluster runs all payment processing."
  })
});

console.log("Executive summary:", boardReport.executive_summary);
console.log("Urgency:", boardReport.urgency_metric);
```

### Webhooks

Event-driven notifications for assessment lifecycle events.

```
POST   /api/v1/organizations/:orgId/webhooks
GET    /api/v1/webhooks/:id/deliveries
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Assessment not found.",
    "details": [],
    "trace_id": "abc-123"
  }
}
```

| Code | HTTP Status | When |
|------|------------|------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `TENANT_CONTEXT_REQUIRED` | 400 | Missing organization header |
| `INVALID_STATE_TRANSITION` | 409 | Lifecycle state conflict |
| `APPROVAL_REQUIRED` | 409 | Needs human approval first |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Rate Limits

| Category | Limit | Window |
|----------|-------|--------|
| Document upload | 30 req | 60s |
| KB search | 60 req | 60s |
| Agent runs | 10 req | 60s |
| Admin routes | 15 req | 60s |
| All others | 120 req | 60s |

---

## Architecture

```
┌──────────────┐
│  Your App    │ ← REST calls
└──────┬───────┘
       │
┌──────▼───────────────────────────────────────────┐
│  Standard API Gateway (Cloudflare Workers)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth     │ │ RBAC     │ │ Rate Limiting    │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ SCF Catalog      │  │ Assessment Engine   │    │
│  │ (1,468 controls) │  │ (Lifecycle + Gates) │    │
│  └─────────────────┘  └─────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Doc Ingestion    │  │ Knowledge Base      │    │
│  │ (R2 + Queues)    │  │ (Vectorize + RAG)   │    │
│  └─────────────────┘  └─────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Gap/Maturity     │  │ POA&M + Reports     │    │
│  │ Analysis         │  │ (Generation + R2)   │    │
│  └─────────────────┘  └─────────────────────┘    │
├──────────────────────────────────────────────────┤
│  PostgreSQL (Neon)  │  R2 Storage  │  Vectorize  │
└──────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Create an API key in the Standard dashboard → API Keys

# 2. Get the SCF version
curl -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-tenant-id: YOUR_ORG_ID" \
     https://standard-api.bekaa.eu/api/v1/scf/versions/latest

# 3. Create an assessment
curl -X POST \
     -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-tenant-id: YOUR_ORG_ID" \
     -H "Content-Type: application/json" \
     -d '{"name": "ISO 27001 Assessment Q2 2026"}' \
     https://standard-api.bekaa.eu/api/v1/assessments

# 4. Upload evidence
curl -X POST \
     -H "Authorization: Bearer standard_live_YOUR_KEY" \
     -H "x-standard-tenant-id: YOUR_ORG_ID" \
     -F "file=@security-policy.pdf" \
     https://standard-api.bekaa.eu/api/v1/assessments/ASSESSMENT_ID/documents
```

---

*Standard API v1 · SCF 2026.1.1 · Built on Cloudflare Workers*
