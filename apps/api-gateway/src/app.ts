import { MockAuthProvider } from "@standard/security";
import { createMockRepositories } from "./adapters";
import type { StandardAuth } from "@standard/auth";
import type { Env } from "./index";
import { ApiError } from "./errors/api-error";
import type { AppDependencies, RouteDefinition } from "./http";
import { json, parseJson, type RequestContext } from "./http";
import { recordAuditEvent } from "./middleware/audit.middleware";
import { resolveAuthContext } from "./middleware/auth.middleware";
import { errorResponse } from "./middleware/error.middleware";
import { assertRateLimit } from "./middleware/rate-limit.middleware";
import { recordRequestObservability } from "./middleware/request-observability.middleware";
import { assertRbac } from "./middleware/rbac.middleware";
import { assertApiKeyScopes } from "./middleware/scope.middleware";
import { resolveTenantContext } from "./middleware/tenant.middleware";
import { resolveTraceId } from "./middleware/trace.middleware";
import { agentRuntimeRoutes } from "./routes/agent-runtime.routes";
import { agentToolsRoutes } from "./routes/agent-tools.routes";
import { apiKeysRoutes } from "./routes/api-keys.routes";
import { approvalsRoutes } from "./routes/approvals.routes";
import { artifactsRoutes } from "./routes/artifacts.routes";
import { assessmentsRoutes } from "./routes/assessments.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { documentsRoutes } from "./routes/documents.routes";
import { gapAnalysisRoutes } from "./routes/gap-analysis.routes";
import { healthRoutes } from "./routes/health.routes";
import { kbRoutes } from "./routes/kb.routes";
import { lifecycleRoutes } from "./routes/lifecycle.routes";
import { memberRoutes } from "./routes/members.routes";
import { organizationsRoutes } from "./routes/organizations.routes";
import { observabilityRoutes } from "./routes/observability.routes";
import { poamRoutes } from "./routes/poam.routes";
import { reportingRoutes } from "./routes/reporting.routes";
import { scfRoutes } from "./routes/scf.routes";
import { soaRoutes } from "./routes/soa.routes";
import { emailRoutes } from "./routes/email.routes";
import { tenantsRoutes } from "./routes/tenants.routes";
import { workflowRoutes } from "./routes/workflow.routes";
import { integrationRoutes } from "./routes/integration.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { privacyRoutes } from "./routes/privacy.routes";
import { socRoutes } from "./routes/soc.routes";
import { executiveRoutes } from "./routes/executive.routes";
import { openapiRoutes } from "./routes/openapi.routes";
import { wellKnownRoutes } from "./routes/well-known.routes";
import { regulationsRoutes } from "./routes/regulations.routes";
import { riskRoutes } from "./routes/risk.routes";
import { projectionRoutes } from "./routes/projection.routes";
import { assessmentsTemplatesRoutes } from "./routes/assessments-templates.routes";
import { workflowsTemplatesRoutes } from "./routes/workflows-templates.routes";
import { referenceDataRoutes } from "./routes/reference-data.routes";
import { intelligenceRoutes } from "./routes/intelligence.routes";
import { jobsRoutes } from "./routes/jobs.routes";

const routes: RouteDefinition[] = [
  ...openapiRoutes,
  ...jobsRoutes,
  ...healthRoutes,
  ...tenantsRoutes,
  ...organizationsRoutes,
  ...apiKeysRoutes,
  ...assessmentsRoutes,
  ...documentsRoutes,
  ...kbRoutes,
  ...gapAnalysisRoutes,
  ...poamRoutes,
  ...reportingRoutes,
  ...agentRuntimeRoutes,
  ...workflowRoutes,
  ...observabilityRoutes,
  ...lifecycleRoutes,
  ...approvalsRoutes,
  ...artifactsRoutes,
  ...scfRoutes,
  ...soaRoutes,
  ...emailRoutes,
  ...agentToolsRoutes,
  ...integrationRoutes,
  ...webhookRoutes,
  ...privacyRoutes,
  ...socRoutes,
  ...executiveRoutes,
  ...dashboardRoutes,
  ...memberRoutes,
  ...wellKnownRoutes,
  ...regulationsRoutes,
  ...riskRoutes,
  ...projectionRoutes,
  ...assessmentsTemplatesRoutes,
  ...workflowsTemplatesRoutes,
  ...referenceDataRoutes,
  ...intelligenceRoutes
];

const matchRoute = (routePath: string, actualPath: string): Record<string, string> | null => {
  const routeParts = routePath.split("/").filter(Boolean);
  const actualParts = actualPath.split("/").filter(Boolean);
  if (routeParts.length !== actualParts.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const expected = routeParts[index]!;
    const actual = actualParts[index]!;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }

  return params;
};

/**
 * Pre-built route index for O(1) bucket lookup instead of O(N) linear scan.
 * Keyed by "METHOD:/api/v1/SEGMENT" to reduce candidates per lookup.
 */
const buildRouteIndex = (allRoutes: RouteDefinition[]): Map<string, RouteDefinition[]> => {
  const index = new Map<string, RouteDefinition[]>();
  for (const route of allRoutes) {
    const segments = route.path.split("/").filter(Boolean);
    // Use first 3 segments for grouping: "api/v1/assessments" or "api/v1/scf"
    const prefix = `${route.method}:/${segments.slice(0, 3).join("/")}`;
    const bucket = index.get(prefix) ?? [];
    bucket.push(route);
    index.set(prefix, bucket);
  }
  return index;
};

const routeIndex = buildRouteIndex(routes);

const findRoute = (method: string, pathname: string): RouteDefinition | undefined => {
  const segments = pathname.split("/").filter(Boolean);
  const prefix = `${method}:/${segments.slice(0, 3).join("/")}`;
  const candidates = routeIndex.get(prefix);
  if (candidates) {
    const found = candidates.find(r => matchRoute(r.path, pathname));
    if (found) return found;
  }
  // Fallback: scan shorter paths (health, root-level)
  return routes.find(r => r.method === method && matchRoute(r.path, pathname));
};

export const createApp = (deps: AppDependencies = createMockRepositories(), env?: Partial<Env>, auth?: StandardAuth) => ({
  async fetch(request: Request, execCtx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const traceId = resolveTraceId(request);

    // ── CORS ────────────────────────────────────────────────
    const isDevMode = env?.STANDARD_ENV === "development" || env?.STANDARD_ENV === "test";
    const allowedOrigins = [
      "https://standard.bekaa.eu",
      "https://standard-web.pages.dev",
      "https://production.standard-web.pages.dev",
      ...(isDevMode ? ["http://localhost:5173", "http://localhost:3000"] : []),
    ];
    const origin = request.headers.get("Origin") ?? "";
    const isPagesDevAlias = origin.endsWith(".standard-web.pages.dev");
    const corsOrigin = allowedOrigins.includes(origin) || isPagesDevAlias ? origin : "";
    const corsHeaders: Record<string, string> = corsOrigin
      ? {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Trace-Id, X-Tenant-Id, x-standard-tenant-id",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }
      : {};

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Relax CSP for docs/llms routes so Scalar UI, fonts, and scripts load correctly
    const isDocsRoute = url.pathname.startsWith("/docs") || url.pathname.startsWith("/llms");
    const cspValue = isDocsRoute
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
      : "default-src 'none'; frame-ancestors 'none';";

    const securityHeaders: Record<string, string> = {
      ...corsHeaders,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": cspValue,
    };

    // Helper to attach headers to any response
    const withSecurityHeaders = (res: Response): Response => {
      const newRes = new Response(res.body, res);
      for (const [k, v] of Object.entries(securityHeaders)) {
        newRes.headers.set(k, v);
      }
      return newRes;
    };

    try {
      // ── Better Auth route delegation ─────────────────────────
      // All /api/auth/* requests are handled by Better Auth directly
      if (auth && url.pathname.startsWith("/api/auth")) {
        try {
          return withSecurityHeaders(await auth.handler(request));
        } catch (authError: unknown) {
          const msg = authError instanceof Error ? authError.message : String(authError);
          const stack = authError instanceof Error ? authError.stack : undefined;
          console.error(`[standard:auth] handler error: ${msg}`, stack);
          const isDev = env?.STANDARD_ENV === "development" || env?.STANDARD_ENV === "test";
          return withSecurityHeaders(new Response(JSON.stringify({ error: msg, ...(isDev ? { stack } : {}) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }));
        }
      }

      const route = findRoute(request.method, url.pathname);
      if (!route) {
        throw new ApiError("NOT_FOUND", "Endpoint not found.", 404);
      }

      const params = matchRoute(route.path, url.pathname)!;
      const context: RequestContext = { request, params, traceId, deps, execCtx };
      const startedAt = Date.now();

      // ── Auth context resolution ──────────────────────────────
      // Use Better Auth session if available, fallback to legacy headers
      const authRequired = route.authRequired ?? (Boolean(route.protected) || Boolean(route.requireActor) || Boolean(route.permissions?.length));
      if (auth) {
        await resolveAuthContext(context, auth, authRequired);
      } else if (env?.STANDARD_ENV !== "production") {
        // Legacy header fallback — ONLY available in dev/test mode
        const legacyActor = request.headers.get("x-standard-actor-id") ?? undefined;
        if (legacyActor) {
          context.actorId = legacyActor;
          const mockAuth = new MockAuthProvider("development");
          const authCtx = await mockAuth.authenticate({
            actorId: legacyActor,
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            authHeader: request.headers.get("authorization") ?? undefined,
            traceId
          });
          if (authCtx) context.auth = authCtx;
        }
        if (authRequired && !context.actorId) {
          throw new ApiError("UNAUTHORIZED", "Authentication is required for this operation.", 401);
        }
      } else {
        // Production without Better Auth = always reject
        if (authRequired) {
          throw new ApiError("UNAUTHORIZED", "Authentication provider is not configured.", 401);
        }
      }

      // Tenant is now derived from session.activeOrganizationId or legacy header
      const tenantRequired = route.tenantRequired ?? (Boolean(route.protected) && !route.path.startsWith("/api/v1/scf") && !route.path.startsWith("/api/v1/admin/scf"));
      resolveTenantContext(context, tenantRequired);

      await assertRbac(context, route.permissions);
      assertApiKeyScopes(context, route.path, request.method);
      await assertRateLimit(context, route.path, env?.STANDARD_CACHE);
      await recordAuditEvent(context, route.path);

      // ── Declarative body validation ───────────────────────────
      // When route defines bodySchema, parse + validate before handler
      if (route.bodySchema && ["POST", "PUT", "PATCH"].includes(request.method)) {
        context.validatedBody = await parseJson(request, route.bodySchema);
      }

      const response = await route.handler(context);
      // Fire-and-forget observability — never blocks the response
      const obsPromise = recordRequestObservability(context, route.path, response, startedAt)
        .catch((obsErr) => console.error("[standard:observability] Failed to record metrics:", obsErr instanceof Error ? obsErr.message : obsErr));
      if (execCtx) {
        execCtx.waitUntil(obsPromise);
      }
      return withSecurityHeaders(response);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        const msg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error(`[standard:api] Unhandled error on ${request.method} ${url.pathname}: ${msg}`, stack);
      }
      return withSecurityHeaders(errorResponse(error, traceId, url.pathname));
    }
  }
});

export const notImplemented = (traceId: string): Response =>
  json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Endpoint reserved for future Standard API contract.",
        details: [],
        trace_id: traceId
      }
    },
    { status: 501 }
  );


