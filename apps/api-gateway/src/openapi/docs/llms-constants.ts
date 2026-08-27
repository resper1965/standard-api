export const LLMS_TXT = `# Standard GRC Platform

> API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF). 10 specialized AI agents, 1,468 controls, 231 frameworks.

## Docs

- [Full Context for LLMs](https://standard-api.bekaa.eu/llms-full.txt): Complete API context in a single file (auto-generated from OpenAPI)
- [OpenAPI Spec (JSON)](https://standard-api.bekaa.eu/docs/openapi.json): Machine-readable OpenAPI 3.1 specification
- [Interactive Docs](https://standard-api.bekaa.eu/docs): Scalar API explorer

## API

Base URL: \`https://standard-api.bekaa.eu\`
Auth: Bearer API key (\`standard_live_...\`) or session cookie
Tenant: \`x-standard-tenant-id\` header (required)

## Sections

- [SCF Catalog](#scf-catalog): 1,468 controls, 231 frameworks, 33 domains
- [Assessments](#assessments): Full lifecycle CRUD + summary KPIs
- [Documents](#documents): Upload, ingest, chunk
- [Knowledge Base](#knowledge-base): Semantic search
- [Scope & SoA](#scope--soa): Scope definition, Statement of Applicability
- [Gap Analysis](#gap-analysis): Findings, approval
- [POA&M](#poam): Remediation planning
- [Reports](#reports): Generate, download, audit package
- [Dashboard KPIs](#dashboard-kpis): Server-computed compliance metrics
- [Audit Trail](#audit-trail): Tenant/org-wide audit event log
- [Members](#members): Organization membership RBAC (invite, role, remove)
- [AI Agents](#ai-agents): 10 specialized agents (Knowledge Steward, SCF Analyst, Framework Mapper, Scope & SoA Architect, Evidence Analyst, Gap Analyst, Maturity Assessor, POA&M Planner, Report Writer, Council Orchestrator)
- [Intelligence Council](#intelligence-council): Async multi-agent workflow dispatch
- [Jobs](#jobs): Job polling for async jobs
- [Agent Runtime](#agent-runtime): Execution monitoring
- [Approvals](#approvals): Human-in-the-loop gates
- [Webhooks](#webhooks): Event-driven integrations
- [API Keys](#api-keys): M2M authentication

## Optional

- [B2B Integration Guide](https://standard-api.bekaa.eu/llms-full.txt): Tenant provisioning, SSO, white-label (see docs/api/B2B_INTEGRATION_GUIDE.md)
- [Privacy SDK Guide](https://standard-api.bekaa.eu/llms-full.txt): RoPA, DPIA, vendor scanning (see docs/api/privacy-ropa-sdk.md)
`;

export const LLMS_FULL_HEADER = (
  spec: any,
  baseUrl: string,
) => `# Standard GRC Platform â€” Complete API Reference

> Agentic GRC intelligence engine. Send text, get structured compliance analysis.
> 1,468 controls Â· 231 frameworks Â· 33 domains Â· 13 AI-powered endpoints
> Auto-generated from OpenAPI ${spec.openapi} spec

Base URL: \\\`${baseUrl}\\\`

## Authentication

Every request requires two headers:

\\\`\\\`\\\`
Authorization: Bearer standard_live_abc123def456
x-standard-tenant-id: org_pa5khl
\\\`\\\`\\\`

- **Bearer API Key**: Machine-to-machine key from the dashboard (prefix: \\\`standard_live_\\\` or \\\`standard_test_\\\`)
- **Session Cookie**: Alternative â€” set by Standard Native Auth after \\\`POST /api/auth/sign-in/email\\\`
- **Tenant Header**: Your organization ID from Standard Native Auth (format: \\\`org_xxxxx\\\`, required for all data-scoped endpoints)

## Internationalization (i18n)

Many endpoints support localized responses via query parameter:

\\\`\\\`\\\`
GET /api/v1/intelligence/compliance-score?locale=en
GET /api/v1/intelligence/compliance-score?locale=pt
\\\`\\\`\\\`

Default locale: \\\`pt\\\` (Portuguese). Fields with \\\`_i18n\\\` suffix are automatically flattened.
Example: \\\`message_i18n: { pt: "...", en: "..." }\\\` â†’ \\\`message: "..."\\\` based on your \\\`?locale=\\\` param.

Supported across: Intelligence, Risk, Regulations, Reference Data, Reporting, and Workflow Templates endpoints.

## Error Format

All errors follow this structure:

\\\`\\\`\\\`json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Assessment not found.",
    "trace_id": "abc-123-def"
  }
}
\\\`\\\`\\\`

Common codes: \\\`VALIDATION_ERROR\\\` (400), \\\`UNAUTHORIZED\\\` (401), \\\`NOT_FOUND\\\` (404), \\\`INTERNAL_ERROR\\\` (500)

Rate limits: 100 req/10s (general) Â· 5/min (sign-in) Â· 3/min (sign-up)

---`;

export const getLlmsFullCookbook = (baseUrl: string) => `
## Cookbook â€” Recipes

> [!NOTE] **SUPPORTED EVIDENCE FORMATS**
> The Standard API supports direct ingestion and automatic parsing of documents and images.
> Supported formats: **PDF, DOCX, XLSX, PNG, JPG, JPEG, WEBP, TXT, MD, CSV, JSON**.
> Binary documents and images are automatically processed using integrated OCR/Document Intelligence services prior to semantic indexing.

> Each recipe is self-contained. Copy the curl command, replace the auth headers, and execute.

---

### Recipe 1: Evidence Compliance Check (Standalone)

> Send a control requirement + evidence description â†’ get compliance verdict with confidence score.

**Endpoint**: \\\`POST /api/v1/gap/evaluate-evidence\\\`
**Use when**: You have a security control and need to verify if your evidence satisfies it.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/gap/evaluate-evidence \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "controlRequirement": "Backup data must be encrypted at rest with AES-256.",
    "evidenceDescription": "Our AWS S3 buckets have SSE-S3 encryption enabled with AES-256. Bucket policies enforce deny on unencrypted PutObject requests."
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "is_compliant": true,
    "confidence_score": 92,
    "missing_elements": [],
    "auditor_notes": "Evidence demonstrates AES-256 encryption at rest via AWS SSE-S3. Bucket policy enforces encryption. Control is satisfied."
  },
  "trace_id": "tr_abc123"
}
\\\`\\\`\\\`

---

### Recipe 2: SOC Incident Triage (Standalone)

> Send raw security logs â†’ get instant L3 diagnosis: false positive or real incident.

**Endpoint**: \\\`POST /api/v1/soc/triage-incident\\\`
**Use when**: Your SIEM fires an alert and you need automated triage before escalation.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/soc/triage-incident \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "systemModuleName": "WAF Edge Firewall",
    "rawLogsExcerpt": "[10/Oct/2026:13:55:36 +0000] GET /admin HTTP/1.1 403 154 - SqlMap/1.4"
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "is_false_positive": false,
    "severity_level": "high",
    "attack_vector_guessed": "SQL Injection (automated scanner)",
    "affected_assets_identified": ["WAF Edge Firewall", "/admin endpoint"],
    "immediate_containment_actions": ["Block source IP", "Enable WAF SQL injection ruleset", "Review admin endpoint access logs"],
    "requires_dpo_breach_notification": false
  },
  "trace_id": "tr_def456"
}
\\\`\\\`\\\`

---

### Recipe 3: Board Risk Translation (Standalone)

> Translate technical cybersecurity risk â†’ C-Level/Board-ready executive summary.

**Endpoint**: \\\`POST /api/v1/executive/translate-risk\\\`
**Use when**: CISO needs to present a technical vulnerability to the board in business terms.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/executive/translate-risk \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "technicalRiskDescription": "Kubernetes pod kube-system exposing port 10250 without authentication (CVE-2018-1002105).",
    "riskCategory": "security",
    "businessContext": "Cluster runs Black Friday payment processing."
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "executive_summary": "A critical vulnerability in our payment processing infrastructure allows unauthorized access to core system management. This could enable attackers to intercept or modify payment transactions.",
    "financial_impact_estimate": "Potential exposure of $2-5M in transaction fraud, plus $500K+ in incident response and forensics costs.",
    "regulatory_impact": "PCI DSS non-compliance. Mandatory breach notification to card networks within 24 hours if exploited.",
    "board_level_recommendation": "Approve emergency patching budget ($50K) and authorize 48-hour maintenance window before Black Friday.",
    "urgency_metric": 95
  },
  "trace_id": "tr_ghi789"
}
\\\`\\\`\\\`

---

### Recipe 4: Vendor Contract Scanner (Standalone)

> Analyze a vendor contract excerpt â†’ detect DPA compliance gaps, sub-processors, and red flags.

**Endpoint**: \\\`POST /api/v1/privacy/scan-vendor-contract\\\`
**Use when**: Legal team needs to evaluate a vendor's data processing agreement.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/privacy/scan-vendor-contract \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "vendorName": "CloudSync Analytics Ltd.",
    "contractExcerpt": "5.1 The Processor agrees to notify the Controller of any breach within 120 hours. 6.2 Data may be transferred to sub-processors in jurisdictions deemed adequate by the Processor."
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "has_standard_contractual_clauses": false,
    "is_dpa_compliant": false,
    "liability_cap_identified": null,
    "data_subprocessors_listed": [],
    "red_flags_for_negotiation": [
      "Breach notification at 120h exceeds GDPR 72h and LGPD 48h requirements",
      "Adequacy determination unilaterally decided by Processor â€” must reference regulator decisions",
      "No sub-processor list provided â€” violates GDPR Art. 28(2) transparency requirement"
    ]
  },
  "trace_id": "tr_jkl012"
}
\\\`\\\`\\\`

---

### Recipe 5: Compliance Score (Standalone â€” No LLM)

> Calculate your compliance score against a specific regulation based on implemented controls.

**Endpoint**: \\\`POST /api/v1/intelligence/compliance-score\\\`
**Use when**: Dashboard needs real-time compliance percentage for a specific framework.
**Note**: Pure computation â€” no LLM call, instant response.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/intelligence/compliance-score \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "regulation_id": "lgpd",
    "scf_controls_implemented": ["DCH-01", "DCH-04", "PRI-01", "PRI-02", "PRI-05", "GOV-01"]
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "regulation_id": "lgpd",
    "score": 35,
    "scf_controls_implemented_count": 6,
    "total_required_controls": 17,
    "missing_controls": ["PRI-03", "PRI-04", "PRI-06", "RSK-01", "..."],
    "message": "O score de conformidade para LGPD Ã© de 35%."
  },
  "trace_id": "tr_mno345"
}
\\\`\\\`\\\`

---

### Recipe 6: Cross-Framework Coverage (Standalone â€” No LLM)

> "I implemented ISO 27001. How much of SOC 2 do I already cover?"

**Endpoint**: \\\`POST /api/v1/intelligence/cross-coverage\\\`
**Use when**: Planning multi-framework compliance â€” see overlap before investing.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/intelligence/cross-coverage \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "source_framework": "iso27001",
    "target_framework": "soc2",
    "scf_controls_implemented": ["GOV-01", "GOV-02", "AST-01", "IAC-01", "IAC-02"]
  }'
\\\`\\\`\\\`

**Response (200)** (with \\\`?locale=en\\\`):
\\\`\\\`\\\`json
{
  "data": {
    "source_framework": "iso27001",
    "target_framework": "soc2",
    "overlap_percentage": 42,
    "shared_implementation_count": 5,
    "total_target_controls": 12,
    "missing_controls": ["CCC-01", "CCC-02", "LOG-01"],
    "interpretation": "Your implemented controls cover 42% of soc2."
  },
  "trace_id": "tr_pqr678"
}
\\\`\\\`\\\`

---

### Recipe 7: ROI Path â€” Optimal Control Prioritization (Standalone â€” No LLM)

> "Which controls should I implement FIRST for maximum compliance impact?"

**Endpoint**: \\\`POST /api/v1/intelligence/roi-path\\\`
**Use when**: Limited budget â€” need to prioritize controls by cross-framework impact.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/intelligence/roi-path \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "target_framework": "iso27001",
    "scf_controls_implemented": ["GOV-01"],
    "top_n": 3
  }'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "target_framework": "iso27001",
    "top_n_requested": 3,
    "total_missing": 28,
    "roi_path": [
      {"control_id": "RSK-01", "roi_score": 8, "mitigations_count": 8, "key_mitigations": ["Risk: Data Breach", "Regulation: lgpd", "Regulation: gdpr"]},
      {"control_id": "IAC-01", "roi_score": 6, "mitigations_count": 6, "key_mitigations": ["Risk: Unauthorized Access", "Regulation: soc2"]},
      {"control_id": "PRI-01", "roi_score": 5, "mitigations_count": 5, "key_mitigations": ["Regulation: lgpd", "Data Category: personal_data"]}
    ],
    "summary": "The fastest path to comply with iso27001 with the highest global impact is to implement the listed 3 controls."
  },
  "trace_id": "tr_stu901"
}
\\\`\\\`\\\`

---

### Recipe 8: Blast Radius â€” Control Impact Topology (Standalone â€” No LLM)

> "If this control fails, what breaks?"

**Endpoint**: \\\`POST /api/v1/intelligence/blast-radius\\\`
**Use when**: Risk assessment â€” understand the downstream impact of a control failure.

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/intelligence/blast-radius \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"control_id": "PRI-01"}'
\\\`\\\`\\\`

**Response (200)**:
\\\`\\\`\\\`json
{
  "data": {
    "control_id": "PRI-01",
    "linked_entities": {
      "risks": [{"category": "Privacy", "risk": "Personal Data Exposure"}],
      "regulations": [{"id": "lgpd", "name": "LGPD"}, {"id": "gdpr", "name": "GDPR"}],
      "data_categories": [{"id": "personal_data", "name": "Personal Data"}],
      "retention_rules": [{"category": "personal_data", "context": "customer_service"}]
    }
  },
  "trace_id": "tr_vwx234"
}
\\\`\\\`\\\`

---

### Recipe 9: Privacy RoPA + DPIA Chain (Agentic â€” 2 calls)

> Analyze a process description for privacy compliance, then assess if DPIA is required.

**Step 1: RoPA Analysis**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/privacy/analyze-ropa \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"description": "We digitize medical records from patients at the reception desk and store them in a cloud database for 10 years.", "org_id": "org_123"}'
\\\`\\\`\\\`

**Step 2: DPIA Assessment**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/privacy/assess-dpia \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "projectDescription": "Digitization of medical records at reception desk",
    "org_id": "org_123",
    "ropa_record": {
      "suggested_risk_level": "high",
      "required_controls": [
        {"control_id": "PRI-01", "name": "Privacy Program"}
      ],
      "suggested_legal_basis": "Explicit consent",
      "is_dpia_required": true
    }
  }'
\\\`\\\`\\\`

---

### Recipe 10: Full Privacy Activity (Multi-step)

> Send natural language â†’ get a complete processing activity with screening and report.

**Step 1: Create the activity**
\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/privacy/processing-activities \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"name": "Customer support tickets", "purpose": "Handle support requests", "legal_basis": "legitimate_interest"}'
\\\`\\\`\\\`

**Step 2: Run screening**
\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/privacy/processing-activities/ACTIVITY_ID/screen \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 3: Generate report**
\\\`\\\`\\\`bash
curl -X GET "${baseUrl}/api/v1/privacy/processing-activities/ACTIVITY_ID/report?format=markdown" \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

---`;

export const getLlmsFullCookbookOps = (baseUrl: string) => `
## Operational Workflows â€” Core Cookbooks

> Multi-step workflows for core GRC operations. Each shows the full endpoint sequence.

---

### Cookbook: Assessment Lifecycle (9 steps)

> Create a compliance assessment from scratch through to Go/No-Go decision.

**Step 1: Create assessment**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"name": "ISO 27001 Q4 2026", "scf_version_id": "SCF_VERSION_UUID", "organization_id": "YOUR_ORG_ID"}'
\\\`\\\`\\\`

**Step 2: Define scope**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/scope \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"framework_id": "iso27001", "departments": ["IT", "HR"], "locations": ["HQ"]}'
\\\`\\\`\\\`

**Step 3: Generate Statement of Applicability (SoA)**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/soa/draft \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 4: Upload evidence documents**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/documents \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -F "file=@security-policy.pdf" \\\\
  -F "file=@access-control-matrix.xlsx"
\\\`\\\`\\\`

**Step 5: Run AI evidence analysis**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/evidence-analysis/run \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 6: Generate Gap Analysis**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/gap-analysis/draft \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 7: Generate POA&M (Plan of Action & Milestones)**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/poam/draft \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 8: Generate Report**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/reports/draft \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Step 9: Check Compliance Gate (Go/No-Go)**

\\\`\\\`\\\`bash
curl -X GET ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/compliance-gate \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Notes**:
- Each draft step (SoA, Gap, PoAM, Report) supports a review workflow: \\\`submit-review\\\` then \\\`approve\\\`
- Use \\\`regenerate\\\` to re-run any draft with updated data
- \\\`compliance-gate\\\` aggregates all artifact statuses into a single Go/No-Go verdict

---

### Cookbook: SCF Catalog & Controls (read-only)

> Browse the Secure Controls Framework: 1,468 controls across 33 domains and 231 mapped frameworks.

**Get latest SCF version:**
\\\`\\\`\\\`bash
curl -X GET ${baseUrl}/api/v1/scf/versions/latest \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY"
\\\`\\\`\\\`

**List controls (paginated, filterable by domain):**
\\\`\\\`\\\`bash
curl -X GET "${baseUrl}/api/v1/scf/versions/SCF_VERSION_ID/controls?domain=PRI&page=1&per_page=50" \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY"
\\\`\\\`\\\`

---

### Cookbook: Gap Analysis & Findings

> Three modes: automated (AI scans documents), standalone (single evidence check), and gap-to-remediation chain.

**Mode A â€” Automated (run against uploaded documents):**

\\\`\\\`\\\`bash
# 1. Run AI evidence analysis
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/evidence-analysis/run \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"

# 2. List evidence findings
curl -X GET ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/evidence-findings \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"

# 3. Generate gap analysis from findings
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/gap-analysis/draft \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"

# 4. Review gap findings
curl -X GET ${baseUrl}/api/v1/gap-analysis/GAP_VERSION_ID/findings \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Mode C â€” Gap to PoAM chain:**

\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/poam/architect-remediation \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"controlGap": "Missing encryption at rest for PII data", "context": "Cloud-hosted SaaS processing healthcare data"}'
\\\`\\\`\\\`

---

### Cookbook: Dashboard KPIs

> Server-computed compliance metrics. Replace local calculations with API-driven KPIs.

**Organization-level dashboard:**
\\\`\\\`\\\`bash
curl -X GET ${baseUrl}/api/v1/organizations/YOUR_ORG_ID/dashboard \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Stateless intelligence (no assessment required):**
- \\\`POST /intelligence/compliance-score\\\` â€” Score vs specific framework (supports ?locale=pt|en)
- \\\`POST /intelligence/cross-coverage\\\` â€” Framework overlap %
- \\\`POST /intelligence/gap-analysis\\\` â€” Stateless gap engine
- \\\`POST /intelligence/roi-path\\\` â€” Optimal control priority

---

### Cookbook: Document Ingestion Pipeline

> Upload, chunk, embed, search. Full document intelligence pipeline.

**Upload documents:**
\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/documents \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -F "file=@policy-document.pdf"
\\\`\\\`\\\`

**Submit for embedding (RAG index):**
\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/documents/DOC_ID/submit-for-embedding \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`

**Semantic search in knowledge base:**
\\\`\\\`\\\`bash
curl -X POST ${baseUrl}/api/v1/assessments/ASSESSMENT_ID/kb/search \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"query": "What is our data retention policy for PII?", "top_k": 5}'
\\\`\\\`\\\`

---

### Cookbook: Audit Trail (read-only)

> All API operations are automatically logged. Query audit logs per tenant or organization.

**By tenant:**
\\\`\\\`\\\`bash
curl -X GET "${baseUrl}/api/v1/tenants/TENANT_ID/audit-logs?limit=50" \\\\
  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\\
  -H "x-standard-tenant-id: YOUR_ORG_ID"
\\\`\\\`\\\`
`;

export const getLlmsFullQuickRef = () => `## Quick Reference

### Standalone Endpoints (1 call = 1 result)

| Endpoint | What it does | LLM? |
|----------|-------------|------|
| \\\`POST /api/v1/gap/evaluate-evidence\\\` | Check evidence against a control | Yes |
| \\\`POST /api/v1/soc/triage-incident\\\` | Triage security incident from logs | Yes |
| \\\`POST /api/v1/executive/translate-risk\\\` | Translate tech risk for board | Yes |
| \\\`POST /api/v1/privacy/scan-vendor-contract\\\` | Scan vendor contract for DPA gaps | Yes |
| \\\`POST /api/v1/intelligence/compliance-score\\\` | Calculate compliance % | No |
| \\\`POST /api/v1/intelligence/cross-coverage\\\` | Cross-framework overlap analysis | No |
| \\\`POST /api/v1/intelligence/roi-path\\\` | Prioritize controls by ROI | No |
| \\\`POST /api/v1/intelligence/blast-radius\\\` | Control failure impact topology | No |
| \\\`POST /api/v1/intelligence/gap-analysis\\\` | Missing controls vs framework | No |
| \\\`POST /api/v1/intelligence/breach-sla\\\` | Breach notification SLA rules | No |
| \\\`POST /api/v1/intelligence/retention-check\\\` | Data retention rules lookup | No |
| \\\`POST /api/v1/intelligence/dpia-score\\\` | DPIA trigger score calculation | No |

### Agentic Chains (output of step N â†’ input of step N+1)

| Flow | Steps |
|------|-------|
| RoPA + DPIA | \\\`analyze-ropa\\\` â†’ \\\`assess-dpia\\\` |
| Evidence + PoAM | \\\`evaluate-evidence\\\` â†’ \\\`architect-remediation\\\` |

### Multi-step Workflows

| Flow | Steps |
|------|-------|
| Privacy Activity | create activity -> screen -> report |
| Full Assessment | \\\`POST assessments\\\` â†’ \\\`upload docs\\\` â†’ \\\`evaluate-evidence\\\` â†’ \\\`compliance-gate\\\` |

### CRUD Resources

| Resource | Base Path | Methods |
|----------|-----------|--------|
| Assessments | \\\`/api/v1/assessments\\\` | CRUD + compliance-gate |
| Documents | \\\`/api/v1/assessments/:id/documents\\\` | Upload, list, get |
| Privacy Activities | \\\`/api/v1/privacy/processing-activities\\\` | Full CRUD + sub-resources |
| SCF Controls | \\\`/api/v1/scf/versions/:id/controls\\\` | Read-only, paginated |
| SCF Frameworks | \\\`/api/v1/scf/frameworks\\\` | Read-only (231 frameworks) |
| Risk Management | \\\`/api/v1/risk/*\\\` | Methodologies, matrices, KRIs, categories |
| Regulations | \\\`/api/v1/regulations\\\` | Legal bases, DSAR, breach rules, consent |
| Reference Data | \\\`/api/v1/reference-data/*\\\` | Data subjects, categories, volume scales |
| SOA (Statement of Applicability) | \\\`/api/v1/soa/*\\\` | Draft, review, approve |
| Scope | \\\`/api/v1/assessments/:id/scope\\\` | CRUD + review workflow |
| TPRA (Third Party Risk) | \\\`/api/v1/tpra/*\\\` | Questionnaires, scoring, SCF mapping |
| Tenants | \\\`/api/v1/tenants\\\` | CRUD (admin only) |
| Webhooks | \\\`/api/v1/webhooks\\\` | CRUD + delivery logs |
| Workflows | \\\`/api/v1/workflows/*\\\` | Start, cancel, resume, signal |
| Reporting | \\\`/api/v1/reports\\\` | Generate assessments reports |

### Additional Intelligence Endpoints

| Endpoint | What it does | LLM? |
|----------|-------------|------|
| \\\`POST /api/v1/intelligence/council\\\` | Orchestrate multi-agent GRC council | Yes |
`;
