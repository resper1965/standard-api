import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import type { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { getRequiredScopesForRoute, z } from "@standard/schemas";
import { registry } from "./registry";
import { responseSchemaFor } from "./response-schemas";
import type { RouteDefinition } from "../http";
import { convertZodToOpenApi } from "./zod-converter";

import * as schemas from "@standard/schemas";

let cachedSpec: any = null;

/**
 * Registers all routes with OpenAPI configurations into the central registry.
 * This should be called once at startup (e.g., from app.ts) to break circular dependencies.
 */
/** Turns "/api/v1/scf/versions/:id/controls" into "SCF" for grouping. */
export function tagForPath(path: string): string {
  // Unversioned paths ("/health", "/llms.txt", and "/" itself) have no
  // /api/v1/ prefix to strip, so splitting leaves an empty leading segment.
  // Falling through with it produced 16 operations tagged "" in the spec.
  const head = path
    .replace(/^\/api\/v\d+\//, "")
    .split("/")
    .find((segment) => segment.length > 0);

  if (!head) return "root";
  return head === "scf" ? "SCF" : head.replace(/-/g, " ");
}

/** Human-readable fallback summary, e.g. "GET /api/v1/poam/{id}". */
function fallbackSummary(method: string, openapiPath: string): string {
  return `${method.toUpperCase()} ${openapiPath}`;
}

/** The response codes every protected route can produce via the middleware. */
const DEFAULT_RESPONSES = {
  200: { description: "Successful response." },
  400: { description: "Validation error." },
  401: { description: "Authentication required." },
  403: { description: "Insufficient permissions or scope." },
  404: { description: "Resource not found." },
} as const;

function pathParamNames(openapiPath: string): string[] {
  return Array.from(
    openapiPath.matchAll(/\{([a-zA-Z0-9_]+)\}/g),
    (match) => match[1] as string,
  );
}

function paramsSchema(names: string[]) {
  return z.object(
    Object.fromEntries(
      names.map((name) => [
        name,
        z.string().openapi({ description: `${name} path parameter.` }),
      ]),
    ),
  );
}

/**
 * The authorization line for a route: the permission a session needs AND the
 * scope an API key needs.
 *
 * Both, because they are different vocabularies and a caller cannot derive one
 * from the other. A route declares `evidence:run`; a key carries `gap:write`.
 * A customer reading only the permission was told the wrong string to ask for,
 * and reported exactly that.
 *
 * Returns null for routes that require no permission, so public endpoints do
 * not grow a misleading clause.
 */
/**
 * Mirrors the gate in app.ts: a route is protected when it says so, or when
 * anything else about it implies authentication. Exported so the tests assert
 * against this definition rather than a second copy that can drift from it.
 */
export function requiresAuth(route: RouteDefinition): boolean {
  return (
    route.authRequired ??
    (Boolean(route.protected) ||
      Boolean(route.requireActor) ||
      Boolean(route.permissions?.length))
  );
}

function authClause(route: RouteDefinition): string | null {
  if (!route.permissions?.length) {
    // Protected, but nothing to derive a scope from, so scope.middleware fails
    // closed and every machine actor gets a 403. The spec used to say nothing
    // at all here, and a customer reasonably read that silence as "open to any
    // valid key" before hitting the 403 on GET /api/v1/regulations.
    if (!requiresAuth(route)) return null;
    return "Not reachable with an API key: this route is protected but declares no permission, so no scope can be derived for it. Reachable with a signed-in session.";
  }

  const scopes = getRequiredScopesForRoute(
    route.method,
    route.path,
    route.permissions,
  );

  const permissions = `Requires permission(s): ${route.permissions.join(", ")}.`;
  if (scopes.length === 0) {
    return `${permissions} Not reachable with an API key: this route is restricted to human actors.`;
  }
  return `${permissions} API keys need scope(s): ${scopes.join(", ")}.`;
}

function synthesizedDescription(route: RouteDefinition): string {
  const base =
    "Generated from the route definition; no hand-written OpenAPI block exists for this endpoint yet.";
  const auth = authClause(route);
  return auth ? `${base} ${auth}` : base;
}

/** A route that opts out of both gates must not advertise the global scheme. */
function isPublic(route: RouteDefinition): boolean {
  return route.protected === false && route.authRequired === false;
}

/**
 * Builds a minimal but valid OpenAPI operation for a route that declares no
 * `openapi` block. Only 57 of 352 routes ever declared one, so the published
 * spec listed 51 paths and omitted /scf/* and /poam/* entirely - the gap a
 * customer hit when integrating. A generated stub is thinner than a
 * hand-written one, but an endpoint that appears with its parameters,
 * auth and permissions beats an endpoint that does not appear at all.
 */
export function synthesizeOperation(
  route: RouteDefinition,
  openapiPath: string,
): Omit<RouteConfig, "method" | "path"> {
  const params = pathParamNames(openapiPath);
  const body = responseSchemaFor(route.method, route.path);
  const ok = body
    ? {
        description: "Successful response.",
        content: { "application/json": { schema: body } },
      }
    : DEFAULT_RESPONSES[200];

  return {
    tags: [tagForPath(route.path)],
    summary: fallbackSummary(route.method, openapiPath),
    description: synthesizedDescription(route),
    responses: { ...DEFAULT_RESPONSES, 200: ok },
    ...(params.length > 0 ? { request: { params: paramsSchema(params) } } : {}),
    ...(isPublic(route) ? { security: [] } : {}),
  } as Omit<RouteConfig, "method" | "path">;
}

const OPENAPI_PATH_PARAM = /:([a-zA-Z0-9_]+)/g;

const toOpenApiPath = (path: string): string =>
  path.replace(OPENAPI_PATH_PARAM, "{$1}");

/**
 * Recovers the request body schema by reading the handler source for the
 * `parseJson(request, SomeSchema)` call. Routes that declare an `openapi`
 * block frequently omit the body, and this keeps the published spec from
 * describing a POST as if it took nothing.
 */
function injectInferredRequestBody(route: RouteDefinition): void {
  if (route.method === "GET" || route.method === "DELETE") return;
  if (!route.openapi) return;
  if (route.openapi.request?.body || (route.openapi as any).requestBody) return;

  const match = route.handler
    .toString()
    .match(
      /parseJson\)?\(?(?:[^,]+,){1,2}\s*(?:[a-zA-Z0-9_.]+\.)?([A-Za-z0-9_]+Schema)/,
    );
  const schemaName = match?.[1];
  if (!schemaName || !(schemas as any)[schemaName]) return;

  route.openapi.request = route.openapi.request || {};
  route.openapi.request.body = {
    content: { "application/json": { schema: (schemas as any)[schemaName] } },
  };
}

/**
 * Adds the authorization line to a hand-written OpenAPI block.
 *
 * The clause used to reach only synthesized operations, so the routes a human
 * had bothered to document were precisely the ones that said nothing about
 * what they need - the inverse of useful. A block that already spells out its
 * own permissions is left alone.
 */
function withAuthClause(
  route: RouteDefinition,
  config: Omit<RouteConfig, "method" | "path">,
): Omit<RouteConfig, "method" | "path"> {
  const auth = authClause(route);
  if (!auth) return config;

  const existing = (config as { description?: string }).description ?? "";
  if (existing.includes("Requires permission(s):")) return config;

  return {
    ...config,
    description: existing ? `${existing} ${auth}` : auth,
  } as Omit<RouteConfig, "method" | "path">;
}

export function registerRoutesForOpenApi(routes: RouteDefinition[]) {
  routes.forEach((route) => {
    injectInferredRequestBody(route);
    const openapiPath = toOpenApiPath(route.path);
    const config = route.openapi
      ? withAuthClause(route, route.openapi)
      : synthesizeOperation(route, openapiPath);
    registry.registerPath({
      method: route.method.toLowerCase() as any,
      path: openapiPath,
      ...config,
    });
  });
}

/**
 * Dynamically generates the final OpenAPI specification JSON by aggregating
 * all routes and schemas registered across the decentralized modules.
 */
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

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const;

const operationsOf = (pathItem: any) =>
  HTTP_METHODS.map((method) => [method, pathItem[method]] as const).filter(
    ([, operation]) => Boolean(operation),
  );

/** zod-to-openapi omits path parameters the route never declared. */
function injectPathParameters(pathStr: string, pathItem: any): void {
  const matches = pathStr.match(/\{([^}]+)\}/g);
  if (!matches) return;
  const names = matches.map((p) => p.replace(/[{}]/g, ""));

  for (const [, operation] of operationsOf(pathItem)) {
    operation.parameters = operation.parameters || [];
    for (const name of names) {
      const exists = operation.parameters.some(
        (p: any) => p.name === name && p.in === "path",
      );
      if (exists) continue;
      operation.parameters.push({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      });
    }
  }
}

/** "/api/v1/risk-register/{id}" + get -> "getRiskRegisterById". */
function deriveOperationId(method: string, pathStr: string): string {
  const segments = pathStr.replace(/\/api\/v1\//, "").split("/");
  const camel = segments.map((segment: string) => {
    if (segment.startsWith("{")) {
      const param = segment.replace(/[{}]/g, "");
      return "By" + param.charAt(0).toUpperCase() + param.slice(1);
    }
    return segment
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  });
  return method + camel.join("");
}

function injectOperationIdAndErrors(pathStr: string, pathItem: any): void {
  for (const [method, operation] of operationsOf(pathItem)) {
    operation.operationId ||= deriveOperationId(method, pathStr);

    const has4xx = Object.keys(operation.responses || {}).some((code) =>
      code.startsWith("4"),
    );
    if (has4xx) continue;

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

function postProcessPaths(spec: any): void {
  if (!spec.paths) return;
  spec.paths = convertZodToOpenApi(spec.paths);

  for (const [pathStr, pathItem] of Object.entries<any>(spec.paths)) {
    injectPathParameters(pathStr, pathItem);
    injectOperationIdAndErrors(pathStr, pathItem);
  }
}

/**
 * Field documentation, applied to the emitted components after generation.
 *
 * `.openapi({ description })` on a Zod schema does not survive: this project
 * converts schemas with its own zod-converter, which reads `def.type` and
 * `def.checks` and nothing else, so the library's metadata is dropped. Rather
 * than leave decoration in the schema files that silently does nothing, the
 * text lives here and is written onto the generated component.
 *
 * Keyed "ComponentName.field". A key naming a component or field that does not
 * exist is a no-op, and the test alongside this file fails on it.
 */
export const FIELD_DOCS: Record<
  string,
  { description: string; example?: string | number | boolean }
> = {
  // Two identifiers, both strings, and not interchangeable. A client keying on
  // one while joining on the other matches nothing and fails silently - a
  // customer lost three nightly assessment runs to exactly that.
  "ScfControlResponse.control_id": {
    description:
      "Surrogate primary key for this control row. Opaque UUID, unique per SCF version: the same control has a different control_id in each version. Use it for links between Standard resources, never as a join key against your own catalogue.",
    example: "9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  },
  "ScfControlResponse.control_code": {
    description:
      "The control's identifier in the Secure Controls Framework, stable across SCF versions. This is the value to join on when reconciling with your own catalogue or another tool's export.",
    example: "GOV-01",
  },
};

/** Returns the keys that matched nothing, so drift is visible rather than silent. */
export function annotateFields(spec: any): string[] {
  const orphans: string[] = [];

  for (const [key, doc] of Object.entries(FIELD_DOCS)) {
    const [component, field] = key.split(".");
    const target =
      spec?.components?.schemas?.[component as string]?.properties?.[
        field as string
      ];
    if (!target) {
      orphans.push(key);
      continue;
    }
    target.description = doc.description;
    if (doc.example !== undefined) target.example = doc.example;
  }

  return orphans;
}

export function generateOpenApiSpec() {
  if (cachedSpec) {
    return cachedSpec;
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);

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

  postProcessPaths(cachedSpec);
  annotateFields(cachedSpec);

  return cachedSpec;
}
