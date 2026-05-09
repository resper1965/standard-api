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

// 5. Get framework requirements for your analysis
const { data: frameworks } = await client.scf.frameworks.list();
const lgpd = frameworks.find(f => f.name.includes("LGPD"));
const { data: requirements } = await client.scf.frameworks.requirements(lgpd.framework_id);

// 6. YOUR APP analyzes against these requirements
// 7. Store results back through the lifecycle API
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
