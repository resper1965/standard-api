# Standard API — Cookbook

> End-to-end recipes for common GRC workflows. Copy-paste ready TypeScript using `@standard/sdk`.

---

## Recipe 1: ISO 27001 Assessment (End-to-End)

```typescript
import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: "standard_live_...",
  tenantId: "your-tenant-uuid",
});

// 1. Get SCF version
const { data: scfVersion } = await client.scf.versions.latest();

// 2. Create assessment
const { data: assessment } = await client.assessments.create({
  organization_id: "org-uuid",
  name: "ISO 27001 - Q3 2026",
  scf_version_id: scfVersion.scf_version_id,
});
const id = assessment.assessment_id;

// 3. Upload evidence documents
const files = ["security-policy.pdf", "access-control.docx", "bcp-plan.pdf"];
for (const filename of files) {
  const file = new File([await Deno.readFile(filename)], filename);
  await client.documents.upload(id, file, filename);
}

// 4. Transition to documents_uploaded
await client.lifecycle.transition(id, { next_state: "documents_uploaded" });

// 5. Wait for ingestion (poll or webhook)
// ... documents_ingested → scf_pre_analysis_ready → framework_selected

// 6. Define scope
await client.assessments.createScope(id, {
  title: "Corporate IT",
  business_units: ["IT", "Engineering"],
  systems: ["ERP", "CRM", "AD"],
});

// 7. Draft SoA — AI maps 93 ISO requirements → SCF controls
const { data: soa } = await client.soa.draft(id, {
  framework_id: "iso-27001-uuid",
  scf_version_id: scfVersion.scf_version_id,
});

// 8. Review AI results
const { data: items } = await client.soa.items(soa.soa_version_id);
console.log(`Total controls: ${items.length}`);
console.log(`Implemented: ${items.filter(i => i.implementation_status === "implemented").length}`);

// 9. Gap analysis
const { data: gap } = await client.gapAnalysis.draft(id, {
  soa_version_id: soa.soa_version_id,
});
const { data: findings } = await client.gapAnalysis.findings(gap.gap_analysis_version_id);
console.log(`Critical gaps: ${findings.filter(f => f.severity === "critical").length}`);

// 10. Generate remediation plan
const { data: poam } = await client.poam.draft(id, {
  gap_analysis_version_id: gap.gap_analysis_version_id,
});

// 11. Get final KPIs
const { data: summary } = await client.assessments.summary(id);
console.log(`Compliance: ${summary.compliance_pct}%`);
console.log(`Open POAMs: ${summary.open_poam_items}`);

// 12. Export audit package
const { data: pkg } = await client.reports.generateAuditPackage(id);
```

---

## Recipe 2: Organization Dashboard

```typescript
// Get org-wide KPIs (no client-side calculation needed)
const { data: dashboard } = await client.organizations.dashboard("org-uuid");

console.log(`Total assessments: ${dashboard.total_assessments}`);
console.log(`Avg compliance: ${dashboard.compliance_avg_pct}%`);
console.log(`Open POAMs: ${dashboard.total_open_poams}`);
console.log(`Critical findings: ${dashboard.total_critical_findings}`);
console.log(`By state:`, dashboard.assessments_by_state);
```

---

## Recipe 3: Audit Trail Query

```typescript
// Tenant-wide: who did what last 30 days
const { data: logs } = await client.assessments.auditLogs("tenant-uuid", {
  since: "2026-04-13T00:00:00Z",
  limit: 100,
});

// Org-level: filter by action
const { data: orgLogs } = await client.organizations.auditLogs("org-uuid", {
  action: "assessment_created",
  limit: 50,
});

for (const log of orgLogs) {
  console.log(`${log.timestamp} | ${log.actor_id} | ${log.action} | ${log.resource_type}`);
}
```

---

## Recipe 4: Member Management

```typescript
// Invite a new auditor
await client.organizations.inviteMember("org-uuid", {
  email: "external-auditor@kpmg.com",
  role: "auditor_readonly",
  display_name: "Maria Souza",
});

// List all members
const { data: members } = await client.organizations.listMembers("org-uuid");
console.table(members.map(m => ({ email: m.email, role: m.role, status: m.status })));

// Promote to admin
await client.organizations.updateMemberRole("member-uuid", { role: "admin" });

// Remove member
await client.organizations.removeMember("member-uuid");
```

---

## Recipe 5: CI/CD Compliance Gate

```typescript
// In your GitHub Action or pipeline:
const { data: gate } = await client.assessments.complianceGate("assessment-uuid");

if (gate.status === "fail") {
  console.error(`❌ Compliance gate FAILED: ${gate.critical_findings} critical findings`);
  process.exit(1);
}

console.log("✅ Compliance gate passed");
```

```yaml
# .github/workflows/compliance-gate.yml
name: Compliance Gate
on: [push]
jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - name: Check compliance
        run: npx standard gate --assessment-id ${{ vars.ASSESSMENT_ID }}
        env:
          STANDARD_API_KEY: ${{ secrets.STANDARD_API_KEY }}
```

---

## Lifecycle State Machine

```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready →
framework_selected → scope_drafted → soa_drafted → soa_under_review →
soa_approved → soa_ingested → evidence_analysis_ready →
gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved →
maturity_assessed → maturity_under_review → maturity_approved →
poam_drafted → poam_under_review → poam_approved →
report_generated → closed
```

**Approval gates** (require human decision): SoA, Gap Analysis, Maturity, POA&M.

---

## Error Handling Pattern

```typescript
import { StandardError } from "@standard/sdk";

try {
  const { data } = await client.assessments.summary("invalid-id");
} catch (error) {
  if (error instanceof StandardError) {
    switch (error.code) {
      case "NOT_FOUND":
        console.error("Assessment not found");
        break;
      case "FORBIDDEN":
        console.error("No permission — check your role");
        break;
      case "INVALID_STATE_TRANSITION":
        console.error("Assessment is not in the right state for this action");
        break;
    }
    console.error(`Trace: ${error.traceId}`); // Send to support
  }
}
```
