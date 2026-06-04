# Quickstart: End-to-End Assessment Lifecycle

> Complete walkthrough: create an organization, provision API keys, run an assessment through the full SCF-based lifecycle.

## Prerequisites

- Standard API key with `*` scope (full access)
- `curl` and `jq` installed
- API base URL (production: `https://standard-api.bekaa.eu`)

```bash
# Set these once
export API_KEY="standard_live_..."
export TENANT_ID="your-organization-uuid"
export BASE="https://standard-api.bekaa.eu/api/v1"
export AUTH="-H 'Authorization: Bearer $API_KEY' -H 'x-standard-organization-id: $TENANT_ID'"
```

---

## Step 1: Create Organization

```bash
curl -s -X POST "$BASE/organizations" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme-corp"}' | jq .
```

**Expected:**
```json
{
  "data": {
    "organization_id": "uuid",
    "organization_id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "status": "active"
  }
}
```

```bash
export ORG_ID="<organization_id from response>"
```

---

## Step 2: Create API Key with Scopes

```bash
curl -s -X POST "$BASE/organizations/$ORG_ID/api-keys" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "CI/CD Key", "scopes": ["assessments:read", "assessments:write", "scf:read"]}' | jq .
```

**Expected:** Returns the full key (only shown once) + masked key + scopes.

---

## Step 3: Get Active SCF Version

```bash
curl -s "$BASE/scf/versions/latest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" | jq .
```

```bash
export SCF_VERSION_ID="<id from response>"
```

---

## Step 4: Create Assessment

**Pre-condition:** Organization exists, SCF version exists.

```bash
curl -s -X POST "$BASE/assessments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\", \"name\": \"Q2 2026 SOC2 Assessment\", \"scf_version_id\": \"$SCF_VERSION_ID\"}" | jq .
```

**Expected:** Assessment in `draft` state.

```bash
export ASSESSMENT_ID="<id from response>"
```

---

## Step 5: Upload Evidence Document

**Pre-condition:** Assessment exists in `draft` state.

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/documents" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -F "file=@./evidence/security-policy.pdf" \
  -F "description=Information Security Policy v3.1" | jq .
```

---

## Step 6: Transition to `documents_uploaded`

**Pre-condition:** At least one document uploaded.

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/transitions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"next_state": "documents_uploaded", "reason": "Evidence uploaded"}' | jq .
```

> **💡 Tip:** Use `GET /assessments/{id}/available-transitions` to check which states are valid next.

---

## Step 7: Select Framework & Transition

```bash
# Transition through: documents_ingested → scf_pre_analysis_ready → framework_selected
# Each requires its own prerequisites to be met
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/transitions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"next_state": "framework_selected", "reason": "SOC2 framework selected"}' | jq .
```

---

## Step 8: Draft SoA

**Pre-condition:** Assessment in `framework_selected` state.

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/soa/draft" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

```bash
export SOA_VERSION_ID="<id from response>"
```

---

## Step 9: Submit & Approve SoA

```bash
# Submit for review
curl -s -X POST "$BASE/soa/$SOA_VERSION_ID/submit-review" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" | jq .

# Approve (requires human approval gate)
curl -s -X POST "$BASE/soa/$SOA_VERSION_ID/approve" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"gate": "soa"}' | jq .
```

---

## Step 10: Draft Gap Analysis

**Pre-condition:** SoA approved → assessment in `soa_approved` state.

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/gap-analysis/draft" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

```bash
export GAP_VERSION_ID="<id from response>"
```

### Add a Finding

```bash
curl -s -X POST "$BASE/gap-analysis/$GAP_VERSION_ID/findings" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "scf_control_id": "<control-uuid>",
    "status": "partially_implemented",
    "severity": "medium",
    "description": "Access control policy exists but lacks periodic review schedule"
  }' | jq .
```

---

## Step 11: Draft POA&M

**Pre-condition:** Gap analysis approved.

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/poam/draft" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

## Step 12: Draft Final Report

**Pre-condition:** All artifacts approved (SoA, Gap Analysis, Maturity, POA&M).

```bash
curl -s -X POST "$BASE/assessments/$ASSESSMENT_ID/reports/draft" \
  -H "Authorization: Bearer $API_KEY" \
  -H "x-standard-organization-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

## Lifecycle State Machine Reference

```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready
→ framework_selected → scope_drafted → soa_drafted → soa_under_review
→ soa_approved → soa_ingested → evidence_analysis_ready
→ gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved
→ maturity_assessed → maturity_under_review → maturity_approved
→ poam_drafted → poam_under_review → poam_approved
→ report_generated → closed
```

**Approval Gates:** SoA, Gap Analysis, Maturity Assessment, POA&M, Report.

Each approval gate requires a human decision via `POST /assessments/{id}/approvals`.
