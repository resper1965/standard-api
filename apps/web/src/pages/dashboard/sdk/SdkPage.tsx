import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState } from "react";
import { useSession } from "../../../lib/auth-client";
import { Link } from "react-router-dom";
import {
  ExternalLink, Terminal, Code2, Bot, Key, Copy, Check,
  Globe, Cpu, Zap, ChevronRight, Package, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_URL } from "@/lib/config";
import "./SdkPage.css";

// ─── Code block with per-snippet copy ──────────────────────────
function CodeBlock({
  code,
  language = "typescript",
  label,
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="sdk-code-block">
      <div className="sdk-code-header">
        <div className="flex items-center gap-2">
          {label && <span className="sdk-code-label">{label}</span>}
          <span className="sdk-code-lang">{language}</span>
        </div>
        <button className="sdk-code-copy" onClick={copy} aria-label="Copy code">
          {copied ? (
            <><Check className="w-3 h-3 mr-1 inline text-emerald-400" />Copied</>
          ) : (
            <><Copy className="w-3 h-3 mr-1 inline" />Copy</>
          )}
        </button>
      </div>
      <pre className="sdk-code-pre"><code>{code}</code></pre>
    </div>
  );
}

// ─── Info card ──────────────────────────────────────────────────
function InfoCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-card/60 shadow-none flex flex-col">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary w-fit">{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
        <div>{action}</div>
      </CardContent>
    </Card>
  );
}

// ─── Step label ─────────────────────────────────────────────────
function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
        {n}
      </span>
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export function SdkPage() {
  useDocumentTitle("SDK & Docs");
  const { data: session } = useSession();
  const tenantId =
    ((session?.session as Record<string, unknown>)?.activeOrganizationId as string) ||
    "<your-tenant-id>";

  // ── REST snippets ─────────────────────────────────────────────
  const curlHealth = `curl ${API_URL}/health`;

  const curlAuth = `curl -X GET "${API_URL}/api/v1/assessments" \\
  -H "Authorization: Bearer standard_live_..." \\
  -H "x-standard-tenant-id: ${tenantId}" \\
  -H "Content-Type: application/json"`;

  const curlCreateAssessment = `curl -X POST "${API_URL}/api/v1/assessments" \\
  -H "Authorization: Bearer standard_live_..." \\
  -H "x-standard-tenant-id: ${tenantId}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "ISO 27001 Gap Analysis",
    "organization_id": "${tenantId}",
    "scf_version_id": "<scf-version-uuid>"
  }'`;

  const curlSCF = `# List all 231 compliance frameworks
curl "${API_URL}/api/v1/scf/frameworks" \\
  -H "Authorization: Bearer standard_live_..." \\
  -H "x-standard-tenant-id: ${tenantId}"

# Get 1,468 controls for a specific SCF version
curl "${API_URL}/api/v1/scf/versions/latest/controls" \\
  -H "Authorization: Bearer standard_live_..." \\
  -H "x-standard-tenant-id: ${tenantId}"`;

  // ── SDK snippets ──────────────────────────────────────────────
  const sdkInstall = `npm install @standard/sdk`;

  const sdkInit = `import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: process.env.STANDARD_API_KEY,  // standard_live_...
  tenantId: "${tenantId}",
  baseUrl: "${API_URL}",                 // optional — defaults to production
});`;

  const sdkAssessment = `// Create and advance an assessment lifecycle
const { data: assessment } = await client.assessments.create({
  name: "ISO 27001 Gap Analysis",
  organization_id: "${tenantId}",
  scf_version_id: await client.scf.getLatestVersionId(),
});

// Upload evidence documents
await client.documents.upload(assessment.id, {
  file: fs.createReadStream("./evidence/policy.pdf"),
  name: "Information Security Policy",
});

// Advance state
await client.assessments.transition(assessment.id, {
  next_state: "documents_uploaded",
  reason: "Policy document uploaded",
});

console.log("Assessment ID:", assessment.id);
console.log("Status:", assessment.status);`;

  const sdkSCF = `// Retrieve SCF controls for a specific framework
const frameworks = await client.scf.listFrameworks();
const iso27001 = frameworks.data.find(f => f.code === "ISO-27001");

const requirements = await client.scf.getRequirements(iso27001!.id);
const mappings    = await client.scf.getMappings({ framework: iso27001!.id });

console.log(\`\${requirements.data.length} requirements\`);
console.log(\`\${mappings.data.length} control mappings\`);`;

  const sdkWebhook = `// Register a webhook to receive lifecycle events
const { data: webhook } = await client.webhooks.create({
  organization_id: "${tenantId}",
  url: "https://your-app.com/webhooks/standard",
  events: [
    "assessment.created",
    "gap.approved",
    "poam.approved",
    "report.generated",
  ],
});

// signing_secret shown ONCE — store securely
console.log("Signing secret:", webhook.signing_secret);`;

  // ── MCP snippets ──────────────────────────────────────────────
  const mcpDocker = `docker run -i --rm \\
  -e STANDARD_API_URL="${API_URL}" \\
  -e STANDARD_API_KEY="standard_live_..." \\
  -e STANDARD_TENANT_ID="${tenantId}" \\
  standard-mcp`;

  const mcpNpx = `npx @standard/mcp-server \\
  --api-url "${API_URL}" \\
  --api-key "standard_live_..." \\
  --tenant-id "${tenantId}"`;

  const mcpCursorConfig = `// cursor.json / .cursor/mcp.json
{
  "mcpServers": {
    "standard-grc": {
      "command": "npx",
      "args": [
        "@standard/mcp-server",
        "--api-url", "${API_URL}",
        "--api-key", "standard_live_...",
        "--tenant-id", "${tenantId}"
      ]
    }
  }
}`;

  // ── AI Prompt snippets ────────────────────────────────────────
  const promptSetup = `# Standard GRC — AI Integration Context

Base URL: ${API_URL}/api/v1
Tenant ID: ${tenantId}

Required headers on EVERY request:
  Authorization: Bearer <API_KEY>
  x-standard-tenant-id: ${tenantId}
  Content-Type: application/json

Full context map (endpoints, lifecycle states, examples):
  ${API_URL}/llms.txt`;

  const promptTask = `You are an AI assistant integrated with the Standard GRC platform.

I need you to perform a gap analysis for ISO 27001 compliance.

Context:
- Platform: Standard SCF Assessment Engine
- Tenant: ${tenantId}
- API: ${API_URL}/api/v1
- Documentation: ${API_URL}/llms.txt

Steps to follow:
1. GET /api/v1/scf/frameworks — find ISO-27001 framework_id
2. GET /api/v1/scf/versions/latest — get scf_version_id
3. POST /api/v1/assessments — create assessment
4. POST /api/v1/assessments/{id}/documents — upload evidence
5. GET /api/v1/scf/frameworks/{id}/requirements — retrieve requirements
6. Analyze evidence against each requirement
7. POST /api/v1/assessments/{id}/transitions — advance lifecycle

Return findings in this format per control:
{ control_code, status: "met"|"gap"|"not_evidenced", confidence, evidence_refs }`;

  const promptLlmsTxt = `@${API_URL}/llms.txt`;

  return (
    <div className="space-y-6 pb-10">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Integrate with the Standard GRC platform via REST API, TypeScript SDK,
          Model Context Protocol (MCP), or AI-native prompts.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            API Online
          </Badge>
          <a
            href={`${API_URL}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            API Reference
          </a>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard
          icon={<Globe className="w-4 h-4" />}
          title="Interactive API Explorer"
          description="Explore the OpenAPI 3.1 spec, test endpoints live and view request/response schemas via Scalar UI."
          action={
            <a
              href={`${API_URL}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Open Scalar UI <ChevronRight className="h-3 w-3" />
            </a>
          }
        />
        <InfoCard
          icon={<Key className="w-4 h-4" />}
          title="API Keys (M2M)"
          description="All requests require a Bearer token. Generate machine-to-machine keys with granular scopes."
          action={
            <Link
              to="/dashboard/api-keys"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Manage Keys <ChevronRight className="h-3 w-3" />
            </Link>
          }
        />
        <InfoCard
          icon={<BookOpen className="w-4 h-4" />}
          title="llms.txt (AI Context)"
          description="Machine-readable context map with all endpoints, lifecycle states, and usage examples for AI agents."
          action={
            <a
              href={`${API_URL}/llms.txt`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              View llms.txt <ChevronRight className="h-3 w-3" />
            </a>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rest" className="w-full">
        <TabsList className="mb-4 bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="rest" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            REST API
          </TabsTrigger>
          <TabsTrigger value="sdk" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            TypeScript SDK
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            MCP Server
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            AI Prompts
          </TabsTrigger>
        </TabsList>

        {/* ── REST API ─────────────────────────────────────── */}
        <TabsContent value="rest" className="space-y-6 animate-slide-up">
          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Authentication</CardTitle>
              <CardDescription>
                Every request requires two headers:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization</code>{" "}
                and{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">x-standard-tenant-id</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Step n={1} title="Verify the API is reachable" />
                <CodeBlock code={curlHealth} language="bash" label="Health check" />
              </div>
              <div>
                <Step n={2} title="Make an authenticated request" />
                <CodeBlock code={curlAuth} language="bash" label="GET /assessments" />
              </div>
              <div>
                <Step n={3} title="Create your first assessment" />
                <CodeBlock code={curlCreateAssessment} language="bash" label="POST /assessments" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SCF Data Queries</CardTitle>
              <CardDescription>
                Query 231 frameworks, 1,468 controls and 15,717 mappings directly — no assessment needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={curlSCF} language="bash" label="SCF catalog" />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg border border-border/40 bg-muted/20">
            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Your Tenant ID is pre-filled:{" "}
              <code className="font-mono text-foreground text-[11px]">{tenantId}</code>
            </span>
          </div>
        </TabsContent>

        {/* ── TypeScript SDK ───────────────────────────────── */}
        <TabsContent value="sdk" className="space-y-6 animate-slide-up">
          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Installation &amp; Setup
              </CardTitle>
              <CardDescription>
                Fully-typed TypeScript SDK for Node.js, Deno, Bun and browser environments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Step n={1} title="Install the package" />
                <CodeBlock code={sdkInstall} language="bash" label="npm" />
              </div>
              <div>
                <Step n={2} title="Initialise the client" />
                <CodeBlock code={sdkInit} language="typescript" label="client.ts" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assessment Lifecycle</CardTitle>
              <CardDescription>
                Create an assessment, upload evidence and advance lifecycle states.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={sdkAssessment} language="typescript" label="lifecycle.ts" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SCF Data Access</CardTitle>
              <CardDescription>
                Query frameworks, controls and mappings to power your own analysis engine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={sdkSCF} language="typescript" label="scf.ts" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Webhooks</CardTitle>
              <CardDescription>
                Receive HMAC-SHA256 signed events when lifecycle states change.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={sdkWebhook} language="typescript" label="webhooks.ts" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MCP Server ───────────────────────────────────── */}
        <TabsContent value="mcp" className="space-y-6 animate-slide-up">
          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Model Context Protocol
              </CardTitle>
              <CardDescription>
                Let AI assistants (Cursor, Claude Code, Copilot) call Standard GRC tools
                natively via the MCP protocol — no manual API calls needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Step n={1} title="Run via Docker (recommended)" />
                <CodeBlock code={mcpDocker} language="bash" label="Docker" />
              </div>
              <div>
                <Step n={2} title="Or run via npx (Node.js)" />
                <CodeBlock code={mcpNpx} language="bash" label="npx" />
              </div>
              <div>
                <Step n={3} title="Configure your IDE (Cursor / VS Code)" />
                <CodeBlock code={mcpCursorConfig} language="json" label="cursor.json" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Available MCP Tools</CardTitle>
              <CardDescription>33+ tools exposed to your AI assistant.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="sdk-resources-grid">
                {[
                  { name: "list_assessments", desc: "List all assessments for the tenant" },
                  { name: "get_assessment", desc: "Get assessment details by ID" },
                  { name: "create_assessment", desc: "Create a new assessment" },
                  { name: "transition_assessment", desc: "Advance lifecycle state" },
                  { name: "upload_document", desc: "Upload an evidence document" },
                  { name: "list_scf_frameworks", desc: "List all 231 frameworks" },
                  { name: "get_scf_controls", desc: "Get controls for a SCF version" },
                  { name: "get_framework_mappings", desc: "Get control→requirement mappings" },
                  { name: "run_gap_analysis", desc: "Dispatch async gap analysis" },
                  { name: "get_job_status", desc: "Poll async job status" },
                  { name: "list_api_keys", desc: "List organization API keys" },
                  { name: "get_audit_logs", desc: "Query audit trail" },
                ].map((t) => (
                  <div key={t.name} className="sdk-resource-card">
                    <span className="sdk-resource-name">{t.name}</span>
                    <span className="sdk-resource-desc">{t.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Prompts ───────────────────────────────────── */}
        <TabsContent value="ai" className="space-y-6 animate-slide-up">
          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Quick Setup Prompt
              </CardTitle>
              <CardDescription>
                Paste this into any AI chat to inject your tenant context. The model will
                resolve the rest from <code className="text-xs">/llms.txt</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={promptSetup} language="text" label="Setup prompt" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task-Oriented Prompt</CardTitle>
              <CardDescription>
                Drop this into your AI session to start a full gap analysis workflow.
                Works with GPT-4o, Claude 3.5, Gemini 1.5 Pro and similar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={promptTask} language="text" label="Gap analysis task" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">IDE Context Injection (llms.txt)</CardTitle>
              <CardDescription>
                In Cursor, Claude Code or GitHub Copilot, prefix your prompt with{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">@URL</code> to
                fetch the full API context map automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={promptLlmsTxt} language="text" label="IDE fetch" />
              <p className="text-xs text-muted-foreground mt-3">
                The <code className="text-[11px]">/llms.txt</code> file contains all
                endpoints, lifecycle states, required headers, payload examples and
                multi-step recipes — optimised for LLM context windows.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
