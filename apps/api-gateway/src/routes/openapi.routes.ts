import type { RouteDefinition } from "../http";
import { json } from "../http";
import { generateOpenAPI } from "../openapi";

const htmlString = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Standard GRC Platform — API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF)." />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/openapi.json"
      data-configuration='{"theme":"deepSpace","hideModels":false,"hideDownloadButton":false}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
`;

// --- LLM context files (inline to avoid fs reads on Workers) ---

const LLMS_TXT = `# Standard GRC Platform

> API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF). 7 specialized AI agents, 1,468 controls, 231 frameworks.

## Docs

- [Functional Guide](https://standard-api-gateway-production.ness.workers.dev/docs/api/GUIDE.md): Architecture, concepts, assessment lifecycle, AI agents
- [API Reference](https://standard-api-gateway-production.ness.workers.dev/docs/api/API_REFERENCE.md): Full endpoint documentation with auth, errors, rate limits
- [Cookbook](https://standard-api-gateway-production.ness.workers.dev/docs/cookbook): End-to-end recipes (ISO 27001 assessment, dashboard, audit trail, members)
- [Full Context for LLMs](https://standard-api-gateway-production.ness.workers.dev/llms-full.txt): Complete API context in a single file
- [OpenAPI Spec (JSON)](https://standard-api-gateway-production.ness.workers.dev/docs/openapi.json): Machine-readable OpenAPI 3.1 specification
- [Interactive Docs](https://standard-api-gateway-production.ness.workers.dev/docs): Scalar API explorer

## API

Base URL: \`https://standard-api-gateway-production.ness.workers.dev\`
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
- [AI Agents](#ai-agents): 7 specialized agents
- [Agent Runtime](#agent-runtime): Execution monitoring
- [Approvals](#approvals): Human-in-the-loop gates
- [Webhooks](#webhooks): Event-driven integrations
- [API Keys](#api-keys): M2M authentication

## Optional

- [B2B Integration Guide](https://standard-api-gateway-production.ness.workers.dev/docs/api/B2B_INTEGRATION_GUIDE.md): Tenant provisioning, SSO, white-label
- [Privacy SDK Guide](https://standard-api-gateway-production.ness.workers.dev/docs/api/privacy-ropa-sdk.md): RoPA, DPIA, vendor scanning
`;

const LLMS_FULL_TXT_URL = "https://raw.githubusercontent.com/resper1965/bekaa-site/main/docs/api/llms-full.txt";
let cachedLlmsFullTxt: string | null = null;

// --- Cookbook (served from static file docs/api/COOKBOOK.md via GitHub) ---
const COOKBOOK_URL = "https://raw.githubusercontent.com/resper1965/bekaa-site/main/docs/api/COOKBOOK.md";
let cachedCookbook: string | null = null;

export const openapiRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/docs/openapi.json",
    authRequired: false,
    tenantRequired: false,
    handler: async (ctx) => {
      const docs = generateOpenAPI();
      return json(docs, { status: 200 });
    }
  },
  {
    method: "GET",
    path: "/openapi.json",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      const docs = generateOpenAPI();
      return new Response(JSON.stringify(docs, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"standard-openapi.json\"",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
  },
  {
    method: "GET",
    path: "/docs",
    authRequired: false,
    tenantRequired: false,
    handler: async (ctx) => {
      return new Response(htmlString, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Link": '</llms.txt>; rel="llms-txt"'
        }
      });
    }
  },
  {
    method: "GET",
    path: "/docs/cookbook",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      if (!cachedCookbook) {
        try {
          const res = await fetch(COOKBOOK_URL);
          if (res.ok) {
            cachedCookbook = await res.text();
          }
        } catch (err) {
          console.warn("[standard:cookbook] Failed to fetch COOKBOOK.md:", err instanceof Error ? err.message : err);
        }
      }

      if (cachedCookbook) {
        return new Response(cachedCookbook, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }

      return new Response("See /docs for API documentation", {
        status: 302,
        headers: { "Location": "/docs" }
      });
    }
  },
  {
    method: "GET",
    path: "/llms.txt",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      return new Response(LLMS_TXT, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
  },
  {
    method: "GET",
    path: "/llms-full.txt",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      if (!cachedLlmsFullTxt) {
        try {
          const res = await fetch(LLMS_FULL_TXT_URL);
          if (res.ok) {
            cachedLlmsFullTxt = await res.text();
          }
        } catch (err) {
          console.warn("[standard:llms] Failed to fetch llms-full.txt from source:", err instanceof Error ? err.message : err);
        }
      }

      if (cachedLlmsFullTxt) {
        return new Response(cachedLlmsFullTxt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }

      return new Response("See /docs for API documentation", {
        status: 302,
        headers: { "Location": "/docs" }
      });
    }
  }
];
