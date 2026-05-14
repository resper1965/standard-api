import { useState } from "react";
import { useSession } from "../../../lib/auth-client";
import "./SdkPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://standard-api-gateway-production.ness.workers.dev";

function CodeBlock({ code, language = "typescript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="sdk-code-block">
      <div className="sdk-code-header">
        <span className="sdk-code-lang">{language}</span>
        <button
          className="sdk-code-copy"
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="sdk-code-pre"><code>{code}</code></pre>
    </div>
  );
}

export function SdkPage() {
  const { data: session } = useSession();
  const tenantId = session?.session?.activeOrganizationId || "<your-tenant-id>";

  const installSnippet = `npm install @standard/sdk`;

  const quickStart = `import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: "standard_live_...",     // From Settings → API Keys
  tenantId: "${tenantId}",
  baseUrl: "${API_URL}",
});`;

  const listAssessments = `const { data } = await client.assessments.list();
console.log(data); // [{ assessment_id, name, state }]`;

  const scfQuery = `// Get all compliance frameworks
const { data: frameworks } = await client.scf.frameworks.list();

// Look up a specific control by code
const { data: control } = await client.scf.controls.byCode("GOV-01");

// Get crosswalk mappings for a framework
const lgpd = frameworks.find(f => f.name.includes("LGPD"));
const { data: reqs } = await client.scf.frameworks.requirements(lgpd.framework_id);`;

  const uploadDoc = `const file = new File([buffer], "security-policy.pdf");
await client.documents.upload(assessmentId, file, "Security Policy v3");`;

  const fullFlow = `// 1. Get SCF version
const { data: version } = await client.scf.versions.latest();

// 2. Create assessment
const { data: assessment } = await client.assessments.create({
  organization_id: "${tenantId}",
  name: "LGPD Compliance Check",
  scf_version_id: version.scf_version_id,
});

// 3. Upload documents
await client.documents.upload(assessment.assessment_id, policyFile, "Privacy Policy");

// 4. Advance lifecycle
await client.lifecycle.transition(assessment.assessment_id, {
  next_state: "documents_uploaded",
  reason: "Evidence uploaded",
});

// 5. Get framework requirements
const { data: requirements } = await client.scf.frameworks.requirements(frameworkId);

// 6. YOUR APP performs analysis using your LLM
// 7. Store results back through lifecycle transitions`;

  const webhookSnippet = `// Register webhook for lifecycle events
const { data } = await client.webhooks.create("${tenantId}", {
  url: "https://your-app.com/hooks/standard",
  events: ["assessment.created", "gap.approved", "report.generated"],
});

// Save this signing secret — shown only ONCE
console.log(data.signing_secret); // "whsec_..."

// Verify signatures on incoming webhooks:
// hmac_sha256(signing_secret, raw_body) === X-Standard-Signature`;

  const errorHandling = `import { StandardError } from "@standard/sdk";

try {
  await client.assessments.get("invalid-uuid");
} catch (error) {
  if (error instanceof StandardError) {
    console.error(error.code);     // "NOT_FOUND"
    console.error(error.status);   // 404
    console.error(error.traceId);  // correlation ID
  }
}`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Use the @standard/sdk to integrate compliance intelligence into your application</p>

      <div className="sdk-page">
        <div className="sdk-badges" style={{ marginBottom: "1.5rem" }}>
          <span className="sdk-badge">TypeScript</span>
          <span className="sdk-badge">Node.js 18+</span>
          <span className="sdk-badge">Deno</span>
          <span className="sdk-badge">Bun</span>
          <span className="sdk-badge">Cloudflare Workers</span>
          <span className="sdk-badge">Browsers</span>
        </div>

        <section className="sdk-section">
          <h2>Installation</h2>
          <CodeBlock code={installSnippet} language="bash" />
        </section>

        <section className="sdk-section">
          <h2>Quick Start</h2>
          <CodeBlock code={quickStart} />
        </section>

        <section className="sdk-section">
          <h2>List Assessments</h2>
          <CodeBlock code={listAssessments} />
        </section>

        <section className="sdk-section">
          <h2>Query SCF Catalog</h2>
          <p className="sdk-note">
            1,468 controls · 231 frameworks · 32,903 requirements · 15,717 crosswalk mappings
          </p>
          <CodeBlock code={scfQuery} />
        </section>

        <section className="sdk-section">
          <h2>Upload Documents</h2>
          <CodeBlock code={uploadDoc} />
        </section>

        <section className="sdk-section">
          <h2>Full Lifecycle Flow</h2>
          <p className="sdk-note">
            Standard provides the data. Your app does the analysis. Results go back through the lifecycle API.
          </p>
          <CodeBlock code={fullFlow} />
        </section>

        <section className="sdk-section">
          <h2>Webhooks</h2>
          <p className="sdk-note">
            Receive HMAC-SHA256 signed notifications for 11 lifecycle events.
          </p>
          <CodeBlock code={webhookSnippet} />
        </section>

        <section className="sdk-section">
          <h2>Error Handling</h2>
          <CodeBlock code={errorHandling} />
        </section>

        <section className="sdk-section">
          <h2>Available Resources</h2>
          <div className="sdk-resources-grid">
            {[
              { name: "client.assessments", desc: "Create, list, update assessments" },
              { name: "client.documents", desc: "Upload, manage, reprocess documents" },
              { name: "client.scf", desc: "Query controls, frameworks, mappings" },
              { name: "client.lifecycle", desc: "State transitions and events" },
              { name: "client.approvals", desc: "Submit approval decisions" },
              { name: "client.artifacts", desc: "Versioned assessment artifacts" },
              { name: "client.soa", desc: "Statement of Applicability" },
              { name: "client.gapAnalysis", desc: "Gap analysis findings" },
              { name: "client.poam", desc: "Plan of Action & Milestones" },
              { name: "client.reports", desc: "Generate, review, export reports" },
              { name: "client.kb", desc: "Semantic search in Knowledge Base" },
              { name: "client.workflows", desc: "Lifecycle orchestration" },
              { name: "client.agents", desc: "AI agent execution monitoring" },
              { name: "client.webhooks", desc: "Webhook endpoint management" },
              { name: "client.organizations", desc: "Org and API key management" },
            ].map(r => (
              <div key={r.name} className="sdk-resource-card">
                <code className="sdk-resource-name">{r.name}</code>
                <span className="sdk-resource-desc">{r.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
