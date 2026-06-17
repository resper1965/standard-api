import type { RouteDefinition } from "../http";
import { json } from "../http";
import { generateOpenApiSpec } from "../openapi/generator";
import { LLMS_TXT } from "../openapi/docs/llms-constants";
import { generateLlmsFullTxt } from "../openapi/docs/llms-generator";

const htmlString = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Standard GRC Platform â€” API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF)." />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>ðŸ›¡ï¸</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="api-reference"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference(document.getElementById('api-reference'), {
        url: '/docs/openapi.json',
        theme: 'deepSpace',
        hideModels: false,
        hideDownloadButton: false
      });
    </script>
  </body>
</html>
`;

export const openapiRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/docs/openapi.json",
    authRequired: false,
    tenantRequired: false,
    handler: async (ctx) => {
      const docs = generateOpenApiSpec();
      return json(docs, { status: 200 });
    },
  },
  {
    method: "GET",
    path: "/openapi.json",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      const docs = generateOpenApiSpec();
      return new Response(JSON.stringify(docs, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="standard-openapi.json"',
          "Cache-Control": "public, max-age=3600",
        },
      });
    },
  },
  {
    method: "GET",
    path: "/",
    authRequired: false,
    tenantRequired: false,
    handler: async (ctx) => {
      return new Response(htmlString, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          Link: '</llms.txt>; rel="llms-txt"',
        },
      });
    },
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
          Link: '</llms.txt>; rel="llms-txt"',
        },
      });
    },
  },
  {
    method: "GET",
    path: "/docs/cookbook",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      return new Response("See /docs for API documentation", {
        status: 302,
        headers: { Location: "/docs" },
      });
    },
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
          "Cache-Control": "public, max-age=3600",
        },
      });
    },
  },
  {
    method: "GET",
    path: "/llms-full.txt",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      const spec = generateOpenApiSpec();
      const fullContent = generateLlmsFullTxt(spec);

      return new Response(fullContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    },
  },
];
