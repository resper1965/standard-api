# @standard/sdk

Official TypeScript SDK for the **Standard API** — SCF-based compliance intelligence platform.

## Quick Start

```typescript
import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: "standard_live_...",     // From Settings → API Keys
  tenantId: "your-tenant-uuid",   // Your tenant ID
});
```

## Usage Examples

### List assessments
```typescript
const { data } = await client.assessments.list();
console.log(data); // [{ assessment_id, name, state }]
```

### Create an assessment
```typescript
const { data } = await client.assessments.create({
  organization_id: "org-uuid",
  name: "ISO 27001 Gap Analysis",
  scf_version_id: "version-uuid",
});
```

### Get assessment summary (server-computed KPIs)
```typescript
const { data } = await client.assessments.summary("assessment-uuid");
console.log(data.compliance_pct);    // 73.5
console.log(data.critical_findings); // 3
console.log(data.open_poam_items);   // 47
```

### Organization dashboard
```typescript
const { data } = await client.organizations.dashboard("org-uuid");
console.log(data.total_assessments);      // 4
console.log(data.compliance_avg_pct);     // 68.2
console.log(data.total_open_poams);       // 47
console.log(data.total_critical_findings); // 3
console.log(data.assessments_by_state);    // { "draft": 1, "poam_approved": 2, "closed": 1 }
```

### Audit trail (tenant-wide)
```typescript
const { data } = await client.assessments.auditLogs("tenant-uuid", {
  action: "assessment_created",
  since: "2026-04-01T00:00:00Z",
  limit: 50,
});
```

### Audit trail (org-level)
```typescript
const { data } = await client.organizations.auditLogs("org-uuid", {
  actor_id: "user-uuid",
  limit: 100,
});
```

### Member management
```typescript
// Invite
await client.organizations.inviteMember("org-uuid", {
  email: "auditor@kpmg.com",
  role: "auditor_readonly",
  display_name: "Maria Souza",
});

// List
const { data } = await client.organizations.listMembers("org-uuid");

// Update role
await client.organizations.updateMemberRole("member-uuid", { role: "admin" });

// Remove
await client.organizations.removeMember("member-uuid");
```

### Query SCF controls
```typescript
// Get all frameworks
const { data: frameworks } = await client.scf.frameworks.list();

// Get controls by domain
const { data: controls } = await client.scf.versions.controls("version-uuid", { limit: 50 });

// Look up control by code
const { data: control } = await client.scf.controls.byCode("GOV-01");
```

### Upload a document
```typescript
const file = new File([buffer], "security-policy.pdf");
const { data } = await client.documents.upload("assessment-uuid", file, "Security Policy v3");
```

### Transition lifecycle
```typescript
await client.lifecycle.transition("assessment-uuid", {
  next_state: "documents_uploaded",
  reason: "All evidence uploaded",
});
```

### Semantic KB search
```typescript
const { data } = await client.kb.search("assessment-uuid", "data retention policy", 10);
```

### CI/CD compliance gate
```typescript
const { data } = await client.assessments.complianceGate("assessment-uuid");
if (data.status === "fail") process.exit(1);
```

### Register a webhook
```typescript
const { data } = await client.webhooks.create("org-uuid", {
  url: "https://your-app.com/hooks/standard",
  events: ["assessment.created", "gap.approved", "report.generated"],
});
console.log(data.signing_secret); // Save this! Shown only once.
```

### Full lifecycle flow
```typescript
// 1. Get latest SCF version
const { data: version } = await client.scf.versions.latest();

// 2. Create assessment  
const { data: assessment } = await client.assessments.create({
  organization_id: "org-uuid",
  name: "LGPD Compliance Check",
  scf_version_id: version.scf_version_id,
});

// 3. Upload evidence
await client.documents.upload(assessment.assessment_id, policyFile, "Privacy Policy");

// 4. Transition to documents_uploaded
await client.lifecycle.transition(assessment.assessment_id, {
  next_state: "documents_uploaded",
});

// 5. Draft SoA → Gap Analysis → POA&M
// 6. Get summary KPIs
const { data: summary } = await client.assessments.summary(assessment.assessment_id);
console.log(`Compliance: ${summary.compliance_pct}%`);
```

## Error Handling

```typescript
import { StandardError } from "@standard/sdk";

try {
  await client.assessments.get("invalid-id");
} catch (error) {
  if (error instanceof StandardError) {
    console.error(error.code);     // "NOT_FOUND"
    console.error(error.status);   // 404
    console.error(error.traceId);  // "trace-uuid"
  }
}
```

## API Key Scopes

Create keys with granular scopes for least-privilege access:

```typescript
const { data } = await client.organizations.createApiKey("org-uuid", {
  name: "Read-Only Analytics",
  scopes: ["assessment:read", "scf:read", "metrics:read"],
});
```

## Platform Compatibility

- Node.js 18+
- Deno
- Bun
- Cloudflare Workers
- Browsers (with CORS)

Zero dependencies. Uses native `fetch`.
