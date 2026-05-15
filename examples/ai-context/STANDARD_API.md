# Standard API Integration Context

> Drop this file into your project's `.cursor/rules/`, `.claude/`, or `.agents/` directory
> to give your AI coding assistant full context about the Standard API.

## What is Standard API?

Standard is a compliance assessment REST API. You call it to run security assessments against 231+ frameworks (SOC 2, ISO 27001, HIPAA, NIST, etc.).

**Base URL:** `https://standard-api-gateway-production.ness.workers.dev`
**Auth:** `Authorization: ApiKey <key>` header on every request
**Prefix:** All endpoints start with `/api/v1`

## Architecture: Controls-as-Truth, Frameworks-as-Masks

```
SCF Controls (1,468 controls) = THE TRUTH
        │
        ├─ Assess against controls ONCE
        ├─ Apply any framework as a "mask" → instant gap analysis
        └─ No re-assessment when you add a new framework
```

## Key Concepts

- **Assessment**: A compliance evaluation lifecycle (14 states from `draft` → `closed`)
- **SCF Control**: One of 1,468 security controls from the Secure Controls Framework
- **Framework**: A compliance standard (ISO 27001, SOC 2, etc.) mapped to SCF controls
- **SoA**: Statement of Applicability — which controls are in scope
- **Gap Analysis**: Findings from comparing evidence against controls
- **PoA&M**: Plan of Action & Milestones for remediation
- **Projection**: Apply any framework as a mask over your control truth table

## Authentication

```
Authorization: ApiKey sk-your-api-key-here
```

API keys are tenant-scoped. Each request must include the key.

## Capabilities — What Can I Build?

| Business Need | Endpoint | Returns |
|---|---|---|
| List all compliance frameworks | `GET /scf/frameworks` | 231 frameworks (ISO 27001, SOC 2, HIPAA...) with requirement counts |
| Get controls for a framework | `GET /scf/frameworks/{id}/requirements` | Requirements mapped to SCF controls |
| Look up control by code | `GET /scf/controls/by-code/GOV-01` | Control description, methods, domain |
| Cross-framework mapping | `GET /scf/controls/{id}/mappings` | Which requirements across frameworks map to this control |
| Start assessment | `POST /assessments` | `{ assessment_id, state: "draft" }` |
| Upload evidence docs | `POST /assessments/{id}/documents` | `{ document_id, status: "queued" }` |
| Check assessment progress | `GET /assessments/{id}/status` | `{ state: "evidence_analyzed", ... }` |
| See valid next actions | `GET /assessments/{id}/available-transitions` | `{ available_transitions: ["gap_analysis_complete", ...] }` |
| Generate SoA | `POST /assessments/{id}/soa/draft` | SoA version with in-scope/excluded controls |
| Get gap findings | `GET /assessments/{id}/gap-analysis` | Findings with severity, evidence, remediation |
| Project compliance | `GET /assessments/{id}/projection/{fwId}` | Instant gap view against ANY framework |
| Get maturity scores | `GET /assessments/{id}/maturity` | Per-domain scores on 1-5 scale |
| Get remediation plan | `GET /assessments/{id}/poam` | Prioritized items with owners and deadlines |
| Generate report | `POST /assessments/{id}/reports/draft` | DOCX/JSON with full traceability |
| Semantic evidence search | `POST /assessments/{id}/kb/search` | Matched document chunks with relevance scores |
| Privacy regulation lookup | `GET /regulations/lgpd` | Full LGPD (legal bases, rights, breach, consent, DPIA, penalties) |
| Risk assessment | `GET /risk/methodology` | 5x5 matrix, taxonomy, KRIs, treatment options |
| Vendor risk scoring | `POST /tpra/score` | Score vendor from questionnaire answers → risk level |
| Process automation | `GET /flow-templates/dsar_response` | Step-by-step workflow with roles and SLAs |
| Data inventory reference | `GET /ropa/data-categories` | 21 data categories with sensitivity, retention, auto-triggers |
| Governance reference | `GET /governance/maturity-levels` | SCR-CMM 1-5 maturity model |
| Audit trail | `GET /audit-events` | Every action: who, what, when, trace_id |

> All endpoints above are prefixed with `/api/v1`.

## Core Workflow

```
POST   /api/v1/assessments                           → Create assessment
POST   /api/v1/assessments/{id}/documents             → Upload evidence
POST   /api/v1/assessments/{id}/transitions           → Advance lifecycle state
GET    /api/v1/assessments/{id}/available-transitions  → Check what's next
POST   /api/v1/assessments/{id}/soa/draft             → Generate SoA
POST   /api/v1/assessments/{id}/approvals             → Approve artifacts
GET    /api/v1/assessments/{id}/gap-analysis           → Get gap findings
GET    /api/v1/assessments/{id}/projection/{fwId}      → Project compliance against ANY framework (mask)
GET    /api/v1/assessments/{id}/reports                → Get generated reports
```

> **Key concept**: The assessment is always against SCF controls. Apply any framework as a "mask"
> using the projection endpoint — ISO 27001 today, SOC 2 tomorrow, zero re-assessment.

## SCF Data Queries

```
GET /api/v1/scf/versions/latest                       → Current SCF version
GET /api/v1/scf/frameworks                            → List 231 frameworks
GET /api/v1/scf/frameworks/{id}/requirements           → Framework requirements
GET /api/v1/scf/versions/{id}/controls?limit=50       → Paginated controls
GET /api/v1/scf/controls/by-code/GOV-01               → Control by code
GET /api/v1/scf/controls/{id}/mappings                → Cross-framework mappings
GET /api/v1/scf/frameworks/{id}/coverage               → Framework coverage summary
GET /api/v1/scf/cross-mapping/{fwA}/{fwB}             → Compare two frameworks (overlap %)
```

## CB-A: Privacy Regulations (LGPD, GDPR, HIPAA)

```
GET /api/v1/regulations                               → List (id, name_en, jurisdiction, counts)
GET /api/v1/regulations/{id}                          → Full regulation object
GET /api/v1/regulations/{id}/legal-bases              → legal_bases + sensitive_legal_bases (Art.11/Art.9)
GET /api/v1/regulations/{id}/rights                   → Data subject rights (sla_days, can_be_denied, scf_controls)
GET /api/v1/regulations/{id}/dsar-statuses            → DSAR workflow states (received→completed/denied)
GET /api/v1/regulations/{id}/breach-rules             → Deadlines, severity, breach_statuses, scf_controls
GET /api/v1/regulations/{id}/transfer-mechanisms      → international_transfer (mechanisms + safeguards + dpa)
GET /api/v1/regulations/{id}/consent                  → consent_types, proof_types, children_age, withdrawal
GET /api/v1/regulations/{id}/dpia-triggers            → DPIA triggers with scf_controls + article
GET /api/v1/regulations/{id}/penalties                → max_fine_pct_revenue, max_fine_absolute, sanctions
```

**Enrichments (v3):** `sensitive_legal_bases`, `dsar_statuses`, `breach_statuses`, `consent_types`, `proof_types`, `code` on legal_bases, `scf_controls` on every sub-resource.

## CB-B: Risk Assessment (Methodology + Taxonomy + KRIs)

```
GET /api/v1/risk/methodology                          → Default methodology (full)
GET /api/v1/risk/methodologies                        → List (id, name_pt)
GET /api/v1/risk/methodologies/{id}                   → Full: scales, matrix, risk_statuses, appetite_levels, treatments
GET /api/v1/risk/methodologies/{id}/matrix            → 25-cell heat map (color, level, action_pt)
GET /api/v1/risk/categories                           → 6 risk categories with colors
GET /api/v1/risk/taxonomy                             → 5 categs, 24 risks, SCF control counts, KRI counts
GET /api/v1/risk/taxonomy/{categoryId}                → Full category with risks
GET /api/v1/risk/taxonomy/{categoryId}/{riskId}       → Single risk: KRIs + mitre_techniques + scf_controls + treatments
GET /api/v1/risk/kris                                  → All KRIs (30+) with threshold colors
GET /api/v1/risk/kris?category=cyber                   → Filter by category
GET /api/v1/risk/kris?frequency=mensal                 → Filter by frequency
GET /api/v1/risk/treatment-options                     → 4 strategies: avoid, mitigate, transfer, accept
GET /api/v1/risk/controls/{riskId}                     → SCF controls for a specific risk
```

**Enrichments (v3):** `risk_statuses`, `appetite_levels`, `label_en`, `mitre_techniques`, `estimated_effort`, `id`+`unit` on KRIs.

## CB-C: TPRA (Third Party Risk Assessment)

```
GET  /api/v1/tpra/questionnaires                      → List questionnaires
GET  /api/v1/tpra/questionnaires/{id}                 → Full questionnaire (8 sections, 29 questions)
GET  /api/v1/tpra/questionnaires/{id}/sections/{sec}  → Single section with questions
GET  /api/v1/tpra/tiers                               → Vendor tier definitions (critical→low)
POST /api/v1/tpra/score                               → Calculate vendor score from answers → risk level
GET  /api/v1/tpra/scf-mapping                          → Which SCF controls each question maps to
```

## CB-D: Flow Templates (Process Automation)

```
GET /api/v1/flow-templates                             → All 9 templates (DSAR, breach, DPIA, consent_renewal, audit, etc.)
GET /api/v1/flow-templates?module=privacy              → Filter by module (privacy, governance, risk)
GET /api/v1/flow-templates/{id}                        → Full template with steps, roles, escalation, SLAs
GET /api/v1/flow-templates/scf-mapping                 → SCF controls per template and per step
```

**Templates:** `dsar_response`, `breach_response`, `dpia_lifecycle`, `consent_renewal`, `audit_lifecycle`, `finding_remediation`, `policy_review`, `risk_treatment`, `vendor_review`.

**Enrichments (v3):** Step IDs, `ai_prompt_hint`, `outputs_pt`, `scf_controls` per step, `severity` on escalation, `sla_article`.

## CB-E: ROPA Reference Data (Data Inventory)

```
GET /api/v1/ropa/data-subjects                        → 11 subject types (employee, customer, minor, patient...)
GET /api/v1/ropa/data-categories                      → 21 categories with sensitivity, retention, auto-triggers
GET /api/v1/ropa/data-categories?sensitivity=special   → Filter sensitive only
GET /api/v1/ropa/life-cycle-stages                    → 6 stages: collection→disposal with scf_controls
GET /api/v1/ropa/data-origins                          → 6 origins: direct, third_party, automated, etc.
GET /api/v1/ropa/collection-methods                   → 9 methods: web_form, cookies, CFTV, biometric...
GET /api/v1/ropa/processing-purposes                  → 15 purposes with typical legal basis + retention
GET /api/v1/ropa/processing-purposes?category=rh       → Filter by department category
GET /api/v1/ropa/retention-rules                      → All retention rules per data category
GET /api/v1/ropa/retention-rules?category=health       → Filter by data category
GET /api/v1/ropa/security-measures                    → 13 measures (technical, organizational, physical)
GET /api/v1/ropa/security-measures?sensitivity=special → Mandatory/recommended for sensitive data
GET /api/v1/ropa/disposal-methods                     → 5 methods: secure_delete, crypto_shred, anonymization...
GET /api/v1/ropa/risk-factors                         → 13 risk factors with DPIA threshold (score >= 8)
GET /api/v1/ropa/volume-scale                         → 5-level volume scale with risk contribution
```

## CB-F: Governance Reference Data

```
GET /api/v1/governance/maturity-levels                → SCR-CMM 1-5 with description_pt
GET /api/v1/governance/bg-check-types                 → 8 background check types with required_for_clearance
GET /api/v1/governance/clearance-levels               → 3 tiers: standard, elevated, privileged
GET /api/v1/governance/departments                    → 11 department templates with typical data/purposes
```

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [],
    "trace_id": "trace-id"
  }
}
```

Status codes: 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (state conflict), 429 (rate limit), 500 (server error).

## Response Format

All list endpoints return:
```json
{
  "data": [...],
  "page": { "limit": 50, "next_cursor": "...", "has_more": true },
  "trace_id": "trace-id"
}
```

## Rate Limits

- Free: 30/min | Starter: 100/min | Business: 500/min | Enterprise: 2000/min
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Idempotency

For mutating operations, include: `Idempotency-Key: <unique-key>`

## Full Documentation

- OpenAPI spec: https://standard-api-gateway-production.ness.workers.dev/docs/openapi.json
- Interactive docs: https://standard-api-gateway-production.ness.workers.dev/docs
- Full LLM context: https://standard-api-gateway-production.ness.workers.dev/llms-full.txt

## Integration Rules

1. Always check `available-transitions` before calling `transitions`
2. Approvals require human decision — don't auto-approve in production
3. All resources are tenant-scoped — cross-tenant access returns 404
4. Document upload uses `multipart/form-data`, not JSON
5. Assessment state machine is strict — skipping states returns 409
6. Every cookbook sub-resource (regulation, risk, flow template) links to SCF via `scf_controls[]`
7. Use `GET /regulations/{id}/legal-bases` to see both `legal_bases` AND `sensitive_legal_bases`
8. DPIA auto-trigger: if ROPA `risk_factors` score >= 8, DPIA is mandatory
