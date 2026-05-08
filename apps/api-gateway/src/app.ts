import { MockAuthProvider } from "@standard/security";
import { createMockRepositories } from "./adapters";
import type { StandardAuth } from "@standard/auth";
import type { Env } from "./index";
import { ApiError } from "./errors/api-error";
import type { AppDependencies, RouteDefinition } from "./http";
import { json, type RequestContext } from "./http";
import { recordAuditPlaceholder } from "./middleware/audit.middleware";
import { resolveAuthContext } from "./middleware/auth.middleware";
import { errorResponse } from "./middleware/error.middleware";
import { assertRateLimit } from "./middleware/rate-limit.middleware";
import { recordRequestObservability } from "./middleware/request-observability.middleware";
import { assertRbac } from "./middleware/rbac.middleware";
import { resolveTenantContext } from "./middleware/tenant.middleware";
import { resolveTraceId } from "./middleware/trace.middleware";
import { agentRuntimeRoutes } from "./routes/agent-runtime.routes";
import { agentToolsRoutes } from "./routes/agent-tools.routes";
import { apiKeysRoutes } from "./routes/api-keys.routes";
import { approvalsRoutes } from "./routes/approvals.routes";
import { artifactsRoutes } from "./routes/artifacts.routes";
import { assessmentsRoutes } from "./routes/assessments.routes";
import { documentsRoutes } from "./routes/documents.routes";
import { gapAnalysisRoutes } from "./routes/gap-analysis.routes";
import { healthRoutes } from "./routes/health.routes";
import { kbRoutes } from "./routes/kb.routes";
import { lifecycleRoutes } from "./routes/lifecycle.routes";
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

const routes: RouteDefinition[] = [
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
  ...integrationRoutes
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

export const createApp = (deps: AppDependencies = createMockRepositories(), env?: Partial<Env>, auth?: StandardAuth) => ({
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const traceId = resolveTraceId(request);

    // ── CORS ────────────────────────────────────────────────
    const allowedOrigins = [
      "https://standard.bekaa.eu",
      "https://standard-web.pages.dev",
      "https://standard-web-m99.pages.dev",
      "http://localhost:5173",
    ];
    const origin = request.headers.get("Origin") ?? "";
    const corsOrigin = allowedOrigins.includes(origin) ? origin : "";
    const corsHeaders: Record<string, string> = corsOrigin
      ? {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Trace-Id, X-Tenant-Id",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }
      : {};

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const securityHeaders: Record<string, string> = {
      ...corsHeaders,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",
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
          return withSecurityHeaders(new Response(JSON.stringify({ error: msg, stack: env?.STANDARD_ENV !== "production" ? stack : undefined }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }));
        }
      }

      const route = routes.find((candidate) => candidate.method === request.method && matchRoute(candidate.path, url.pathname));
      if (!route) {
        throw new ApiError("NOT_FOUND", "Endpoint not found.", 404);
      }

      const params = matchRoute(route.path, url.pathname)!;
      const context: RequestContext = { request, params, traceId, deps };
      const startedAt = Date.now();

      // ── Auth context resolution ──────────────────────────────
      // Use Better Auth session if available, fallback to legacy headers
      const authRequired = route.authRequired ?? (Boolean(route.protected) || Boolean(route.requireActor) || Boolean(route.permissions?.length));
      if (auth) {
        await resolveAuthContext(context, auth, authRequired);
      } else {
        // Legacy header fallback (dev/test mode without Better Auth)
        const legacyActor = request.headers.get("x-standard-actor-id") ?? undefined;
        if (legacyActor) {
          context.actorId = legacyActor;
          // Resolve auth context via MockAuthProvider to respect role-based permissions
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
      }

      // Tenant is now derived from session.activeOrganizationId or legacy header
      const tenantRequired = route.tenantRequired ?? (Boolean(route.protected) && !route.path.startsWith("/api/v1/scf") && !route.path.startsWith("/api/v1/admin/scf"));
      resolveTenantContext(context, tenantRequired);

      await assertRbac(context, route.permissions);
      await assertRateLimit(context, route.path, env?.STANDARD_CACHE);
      await recordAuditPlaceholder(context, route.path);

      const response = await route.handler(context);
      await recordRequestObservability(context, route.path, response, startedAt);
      return withSecurityHeaders(response);
    } catch (error) {
      return withSecurityHeaders(errorResponse(error, traceId));
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


