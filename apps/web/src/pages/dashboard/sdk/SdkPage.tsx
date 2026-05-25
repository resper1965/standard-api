import { useState } from "react";
import { useSession } from "../../../lib/auth-client";
import { Link } from "react-router-dom";
import { ExternalLink, Terminal, Code2, Bot, Key } from "lucide-react";
import "./SdkPage.css";

import { API_URL } from "@/lib/config";

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

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Portal</h1>
        <p className="text-muted-foreground mt-2">
          Integrate the Standard GRC platform with your applications, AI assistants, and CI/CD pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <ExternalLink className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Interactive API Explorer</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Explore the OpenAPI 3.1 specification, test endpoints in real-time, and view request/response schemas via our Scalar UI.
            </p>
          </div>
          <div className="mt-auto">
            <a 
              href={`${API_URL}/`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              Open API Reference
            </a>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Authentication (API Keys)</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              All API requests require a Bearer token. Create machine-to-machine (M2M) credentials with granular scopes.
            </p>
          </div>
          <div className="mt-auto">
            <Link 
              to="/dashboard/settings" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Manage API Keys
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI & Agents Context */}
        <section className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold m-0">AI IDEs & MCP Integration</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Standard is an "API-First" & "AI-First" platform. Point your AI assistants (Cursor, Claude Code, GitHub Copilot) directly to our context map to auto-generate integrations.
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">1. LLM Context Map</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Paste this prompt into your IDE's AI chat to inject the entire Standard API knowledge base into its context window:
              </p>
              <CodeBlock code={`@${API_URL}/llms.txt`} language="text" />
            </div>

            <div className="pt-2">
              <h4 className="font-medium text-sm mb-2">2. Local MCP Server (Model Context Protocol)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Allow your local AI assistants to directly run Gap Analyses and poll async GRC jobs by running our Dockerized MCP Server:
              </p>
              <CodeBlock code={`docker run -i --rm \\
  -e STANDARD_API_URL=${API_URL} \\
  -e STANDARD_API_KEY=your_api_key \\
  -e STANDARD_TENANT_ID=${tenantId} \\
  standard-mcp`} language="bash" />
            </div>
          </div>
        </section>

        {/* Traditional SDK */}
        <section className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold m-0">TypeScript SDK (Node/Web)</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Build serverless integrations rapidly with our fully typed TypeScript SDK.
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Installation</h4>
              <CodeBlock code={`npm install @standard/sdk`} language="bash" />
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Async Council Dispatch</h4>
              <CodeBlock code={`import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: "standard_live_...",
  tenantId: "${tenantId}",
});

// Dispatch an asynchronous job
const { data: council } = await client.intelligence.dispatchCouncil({
  tenant_id: "${tenantId}",
  context: "Architecture document",
  agents: ["evidence_evaluator"]
});

// Poll the result
const { data: job } = await client.jobs.getStatus(council.job_id);
console.log(job.status);`} language="typescript" />
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
