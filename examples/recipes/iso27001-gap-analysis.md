# Recipe: Gap Analysis against ISO 27001 from Documents

> Upload your security documents → Standard reads them → You get a gap analysis against ISO 27001

## Prerequisites

- API Key (get one during onboarding)
- Your security documents (PDF, DOCX, or TXT)
  - Examples: Information Security Policy, Access Control Policy, Incident Response Plan, BCP/DRP, etc.

## The Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Create         │────▶│  Upload          │────▶│  Select         │
│  Assessment     │     │  Documents       │     │  ISO 27001      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
┌─────────────────┐     ┌──────────────────┐     ┌──────▼──────────┐
│  Get Gap        │◀────│  Approve         │◀────│  Generate       │
│  Analysis       │     │  SoA             │     │  SoA Draft      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Step-by-step

Set your environment:

```bash
export API_URL="https://standard-api-gateway-production.ness.workers.dev"
export API_KEY="sk-your-api-key"
export ORG_ID="your-organization-id"
```

### 1. Get the ISO 27001 framework ID

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/frameworks" \
  | jq '.data[] | select(.name | test("ISO.?27001")) | {id, name, requirement_count}'
```

Response:
```json
{
  "id": "fw-uuid-iso27001",
  "name": "ISO 27001:2022",
  "requirement_count": 142
}
```

Save the framework ID:
```bash
export FRAMEWORK_ID="fw-uuid-iso27001"
```

### 2. Get the latest SCF version

```bash
SCF_VERSION=$(curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/versions/latest" \
  | jq -r '.scf_version_id')
echo "SCF Version: $SCF_VERSION"
```

### 3. Create the assessment

```bash
ASSESSMENT=$(curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"name\": \"ISO 27001 Gap Analysis - $(date +%Y-%m)\",
    \"scf_version_id\": \"$SCF_VERSION\"
  }" \
  "$API_URL/api/v1/assessments")

ASSESSMENT_ID=$(echo "$ASSESSMENT" | jq -r '.assessment_id')
echo "Assessment: $ASSESSMENT_ID (state: draft)"
```

### 4. Upload your documents

Upload each document. Standard will automatically extract text, chunk it, and build a knowledge base for evidence analysis.

```bash
# Upload your Information Security Policy
curl -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -F "file=@./policies/information-security-policy.pdf" \
  -F "description=Corporate Information Security Policy v3.0" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/documents"

# Upload Access Control Policy
curl -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -F "file=@./policies/access-control-policy.pdf" \
  -F "description=Access Control and Identity Management Policy" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/documents"

# Upload Incident Response Plan
curl -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -F "file=@./policies/incident-response-plan.pdf" \
  -F "description=Security Incident Response Procedures" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/documents"

# Upload as many documents as needed...
```

> **Tip:** Upload everything relevant — policies, standards, procedures, audit reports, risk assessments. More evidence = better gap analysis.

### 5. Wait for ingestion to complete

Documents are processed asynchronously. Check status:

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/ingestion-jobs" \
  | jq '.data[] | {document_id, status}'
```

Wait until all jobs show `"status": "completed"`.

### 6. Advance the lifecycle

```bash
# Mark documents as uploaded
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"next_state": "documents_uploaded"}' \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/transitions"

# Select the ISO 27001 framework
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"next_state\": \"framework_selected\", \"framework_id\": \"$FRAMEWORK_ID\"}" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/transitions"
```

### 7. Generate the Statement of Applicability (SoA)

The SoA maps ISO 27001 requirements to SCF controls and determines which are in scope:

```bash
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/soa/draft" \
  | jq '{soa_version_id, control_count: (.items | length)}'
```

Response:
```json
{
  "soa_version_id": "soa-uuid",
  "control_count": 93
}
```

### 8. Review and approve the SoA

```bash
SOA_VERSION_ID="soa-uuid"

# Submit for review
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/soa/$SOA_VERSION_ID/submit-review"

# Approve (requires human decision)
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gate": "soa_approval"}' \
  "$API_URL/api/v1/artifacts/$SOA_VERSION_ID/approve"
```

### 9. Run evidence analysis + gap analysis

```bash
# Transition to evidence analysis (AI agents analyze your documents)
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"next_state": "evidence_analyzed"}' \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/transitions"

# Transition to gap analysis
curl -s -X POST \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"next_state": "gap_analysis_complete"}' \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/transitions"
```

### 10. Get your gap analysis results 🎉

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/assessments/$ASSESSMENT_ID/gap-analysis" \
  | jq '.'
```

Response (example):
```json
{
  "gap_analysis_version_id": "ga-uuid",
  "status": "draft",
  "summary": {
    "total_controls_assessed": 93,
    "fully_compliant": 41,
    "partially_compliant": 32,
    "non_compliant": 15,
    "not_assessed": 5
  },
  "findings": [
    {
      "finding_id": "find-001",
      "control_code": "GOV-01",
      "control_title": "Governance & Management Framework",
      "iso_requirement": "A.5.1 - Policies for information security",
      "compliance_status": "partially_compliant",
      "severity": "medium",
      "evidence_refs": ["doc-uuid-1:chunk-42", "doc-uuid-2:chunk-15"],
      "observation": "Information security policy exists but lacks annual review clause required by ISO 27001 A.5.1.",
      "remediation": "Add mandatory annual review cycle and document the review process."
    },
    {
      "finding_id": "find-002",
      "control_code": "IAC-01",
      "control_title": "Identity & Access Control",
      "iso_requirement": "A.8.2 - Privileged access rights",
      "compliance_status": "non_compliant",
      "severity": "high",
      "evidence_refs": [],
      "observation": "No evidence found for privileged access management procedures.",
      "remediation": "Implement a PAM solution and document privileged account lifecycle."
    }
  ],
  "trace_id": "trace-gap-001"
}
```

## What's Next?

After gap analysis, you can continue the lifecycle to get:

```bash
# Maturity scoring (1-5 per domain)
POST /api/v1/assessments/{id}/transitions  → {"next_state": "maturity_scored"}
GET  /api/v1/assessments/{id}/maturity

# Remediation plan (PoA&M with priorities and deadlines)
POST /api/v1/assessments/{id}/transitions  → {"next_state": "poam_generated"}
GET  /api/v1/assessments/{id}/poam

# Final audit report (DOCX download)
POST /api/v1/assessments/{id}/reports/draft
GET  /api/v1/assessments/{id}/reports
```

## TypeScript Version

```typescript
const BASE = "https://standard-api-gateway-production.ness.workers.dev";
const headers = {
  "Authorization": `ApiKey ${process.env.STANDARD_API_KEY}`,
  "Content-Type": "application/json",
};

// 1. Find ISO 27001
const frameworks = await fetch(`${BASE}/api/v1/scf/frameworks`, { headers }).then(r => r.json());
const iso27001 = frameworks.data.find((f: any) => f.name.includes("ISO 27001"));

// 2. Create assessment
const assessment = await fetch(`${BASE}/api/v1/assessments`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    organization_id: "your-org-id",
    name: "ISO 27001 Gap Analysis",
    scf_version_id: "your-scf-version",
  }),
}).then(r => r.json());

// 3. Upload documents
for (const file of ["policy.pdf", "controls.pdf", "incident-plan.pdf"]) {
  const form = new FormData();
  form.append("file", await Bun.file(file));
  form.append("description", file);
  await fetch(`${BASE}/api/v1/assessments/${assessment.assessment_id}/documents`, {
    method: "POST",
    headers: { "Authorization": headers.Authorization },
    body: form,
  });
}

// 4. Advance lifecycle → gap analysis
for (const state of ["documents_uploaded", "framework_selected", "soa_drafted"]) {
  await fetch(`${BASE}/api/v1/assessments/${assessment.assessment_id}/transitions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ next_state: state }),
  });
}

// 5. Get results
const gaps = await fetch(
  `${BASE}/api/v1/assessments/${assessment.assessment_id}/gap-analysis`,
  { headers }
).then(r => r.json());

console.log(`✅ ${gaps.summary.total_controls_assessed} controls assessed`);
console.log(`⚠️  ${gaps.summary.non_compliant} non-compliant findings`);
console.log(`📋 ${gaps.findings.length} detailed findings with remediation`);
```

## Python Version

```python
import httpx, os

BASE = "https://standard-api-gateway-production.ness.workers.dev"
KEY = os.getenv("STANDARD_API_KEY")
client = httpx.Client(base_url=BASE, headers={"Authorization": f"ApiKey {KEY}"})

# Find ISO 27001
frameworks = client.get("/api/v1/scf/frameworks").json()
iso = next(f for f in frameworks["data"] if "ISO 27001" in f["name"])

# Create assessment
assessment = client.post("/api/v1/assessments", json={
    "organization_id": "your-org-id",
    "name": "ISO 27001 Gap Analysis",
    "scf_version_id": "your-scf-version",
}).json()
aid = assessment["assessment_id"]

# Upload documents
for path in ["policy.pdf", "controls.pdf", "incident-plan.pdf"]:
    with open(path, "rb") as f:
        client.post(f"/api/v1/assessments/{aid}/documents",
                     files={"file": f}, data={"description": path})

# Advance lifecycle
for state in ["documents_uploaded", "framework_selected", "soa_drafted",
              "evidence_analyzed", "gap_analysis_complete"]:
    client.post(f"/api/v1/assessments/{aid}/transitions",
                json={"next_state": state})

# Get gap analysis
gaps = client.get(f"/api/v1/assessments/{aid}/gap-analysis").json()
print(f"✅ {gaps['summary']['total_controls_assessed']} controls assessed")
print(f"⚠️  {gaps['summary']['non_compliant']} non-compliant")
for f in gaps["findings"][:5]:
    print(f"  [{f['severity']}] {f['control_code']}: {f['observation']}")
```
