import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
import type { RouteDefinition } from "../http";
import { convertZodToOpenApi } from "./zod-converter";

import * as schemas from "@standard/schemas";

let cachedSpec: any = null;

/**
 * Registers all routes with OpenAPI configurations into the central registry.
 * This should be called once at startup (e.g., from app.ts) to break circular dependencies.
 */
export function registerRoutesForOpenApi(routes: RouteDefinition[]) {
  routes.forEach((route) => {
    if (route.openapi) {
      // Auto-inject missing requestBody by statically analyzing the handler code
      if (route.method !== "GET" && route.method !== "DELETE") {
        if (
          !route.openapi.request?.body &&
          !(route.openapi as any).requestBody
        ) {
          const handlerStr = route.handler.toString();
          // Match: parseJson)(context.request, import_schemas.CreateTenantRequestSchema) OR parseJson(context.request,CreateTenantRequestSchema)
          const match = handlerStr.match(
            /parseJson\)?\(?(?:[^,]+,){1,2}\s*(?:[a-zA-Z0-9_.]+\.)?([A-Za-z0-9_]+Schema)/,
          );
          if (match && match[1] && (schemas as any)[match[1]]) {
            route.openapi.request = route.openapi.request || {};
            route.openapi.request.body = {
              content: {
                "application/json": {
                  schema: (schemas as any)[match[1]],
                },
              },
            };
          }
        }
      }

      const openapiPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      registry.registerPath({
        method: route.method.toLowerCase() as any,
        path: openapiPath,
        ...route.openapi,
      });
    }
  });
}

/**
 * Dynamically generates the final OpenAPI specification JSON by aggregating
 * all routes and schemas registered across the decentralized modules.
 */
export function generateOpenApiSpec() {
  if (cachedSpec) {
    return cachedSpec;
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const baseDescription =
    "API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF). Features 10 specialized AI agents, assessment lifecycle management, document ingestion, knowledge base search, and multi-tenant authorization.";

  const aiFirstNotice = `
> **🤖 AI-Dev First**: Se você é um Agente Autônomo ou está configurando uma integração LLM, consuma nossa documentação contextual nativa em [\`/llms-full.txt\`](/llms-full.txt).
  `;

  const policies = `
## 🚦 API Policies & Guarantees

### 1. Versioning Policy
Standard GRC follows a strict, non-breaking versioning policy for \`/api/v1/\`:
- **Additive Changes:** New fields in JSON responses are not considered breaking changes. Client SDKs must ignore unknown fields.
- **Breaking Changes:** Any breaking change (renamed fields, removed fields, change of type) will result in a new API version (e.g., \`/api/v2/\`).
- **Sunset Period:** Deprecated endpoints will continue to function and return a \`Deprecation: true\` header for at least **90 days** before removal.

### 2. Rate Limits & AI Budget
- **General API:** \`100 requests / 10 seconds\` per tenant.
- **AI Endpoints (Intelligence & Agents):** Handled via Cloudflare AI Gateway. Large batches are enqueued.
- **Circuit Breaker:** Requests loop-detected per tenant will return \`429 Too Many Requests\`.

### 3. Asynchronous AI Operations (ADR-003)
AI endpoints (like evaluate-evidence) are **asynchronous**.
- They return \`HTTP 202 Accepted\` and a \`job_id\`.
- You must rely on **Webhooks** or poll the job status.

### 4. Idempotency
POST endpoints that generate artifacts (e.g., Gap Analysis Draft) support the \`Idempotency-Key\` header. Passing the same key multiple times will return the exact same cached response (\`200 OK\` or \`409 Conflict\` depending on the resource state) without regenerating the artifact.

### 5. Webhooks & Security (HMAC)
All Webhooks dispatched by Standard GRC include an \`x-standard-signature\` header.
- **Signature Algorithm:** HMAC-SHA256 of the raw payload using your Webhook Secret.
- **Retry Policy:** Exponential backoff via Cloudflare Queues (up to 5 retries over 24h).
`;

  const cookbooks =
    "\n\n---\n\n## 📖 Manuais & Cookbook\n\nConsulte [`/llms-full.txt`](/llms-full.txt) para workflows completos e [`/llms.txt`](/llms.txt) para referência rápida.";

  const fullDescription = [
    baseDescription,
    aiFirstNotice,
    policies,
    cookbooks,
  ].join("\n\n---\n\n");

  cachedSpec = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Standard GRC Platform - API Reference",
      version: "1.0.0",
      description: fullDescription,
    },
    servers: [
      { url: "/", description: "Current environment" },
      { url: "https://standard-api.bekaa.eu", description: "Production" },
    ],
    security: [{ BearerApiKey: [] }],
  });

  // Convert raw Zod objects to proper OpenAPI formats
  if (cachedSpec.components && cachedSpec.components.schemas) {
    cachedSpec.components.schemas = convertZodToOpenApi(
      cachedSpec.components.schemas,
    );
  }

  // Convert responses and requestBodies as well to be safe
  if (cachedSpec.paths) {
    cachedSpec.paths = convertZodToOpenApi(cachedSpec.paths);

    // Automatically inject missing path parameters
    for (const [pathStr, pathItem] of Object.entries<any>(cachedSpec.paths)) {
      const pathParamsMatch = pathStr.match(/\{([^}]+)\}/g);
      if (pathParamsMatch) {
        const paramNames = pathParamsMatch.map((p) => p.replace(/[{}]/g, ""));
        for (const method of [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "options",
          "head",
        ]) {
          if (pathItem[method]) {
            const operation = pathItem[method];
            operation.parameters = operation.parameters || [];

            for (const paramName of paramNames) {
              const exists = operation.parameters.some(
                (p: any) => p.name === paramName && p.in === "path",
              );
              if (!exists) {
                operation.parameters.push({
                  name: paramName,
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                });
              }
            }
          }
        }
      }

      // Also inject operationId and 4XX responses for all methods in this path
      for (const method of [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "options",
        "head",
      ]) {
        if (pathItem[method]) {
          const operation = pathItem[method];

          if (!operation.operationId) {
            const segments = pathStr.replace(/\/api\/v1\//, "").split("/");
            const cleanSegments = segments.map((s: string) => {
              if (s.startsWith("{")) {
                const param = s.replace(/[{}]/g, "");
                return "By" + param.charAt(0).toUpperCase() + param.slice(1);
              }
              // kebab-case to camelCase
              return s
                .split("-")
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join("");
            });
            operation.operationId = method + cleanSegments.join("");
          }

          const has4xx = Object.keys(operation.responses || {}).some((k) =>
            k.startsWith("4"),
          );
          if (!has4xx) {
            operation.responses = operation.responses || {};
            operation.responses["400"] = {
              description: "Bad Request / Validation Error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            };
          }
        }
      }
    }
  }

  return cachedSpec;
}
