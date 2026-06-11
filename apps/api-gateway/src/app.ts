import { createMockRepositories } from "./adapters";
import { runWithTenantContext } from "@standard/security";
import type { StandardAuth } from "@standard/auth";
import type { Env } from "./index";
import { ApiError } from "./errors/api-error";
import type { AppDependencies, RouteDefinition } from "./http";
import { json, parseJson, type RequestContext } from "./http";
import { recordAuditEvent } from "./middleware/audit.middleware";
import { errorResponse } from "./middleware/error.middleware";
import { assertRateLimit } from "./middleware/rate-limit.middleware";
import { recordRequestObservability } from "./middleware/request-observability.middleware";
import { assertRbac } from "./middleware/rbac.middleware";
import { assertApiKeyScopes } from "./middleware/scope.middleware";
import { resolveOrganizationContext } from "./middleware/tenant.middleware";
import { resolveTraceId } from "./middleware/trace.middleware";
import {
  checkIdempotency,
  storeIdempotencyResult,
} from "./middleware/idempotency.middleware";
import {
  verifyCsrf,
  generateCsrfToken,
  buildCsrfCookie,
} from "./middleware/csrf.middleware";
import {
  resolveAllowedOrigins,
  buildCorsHeaders,
  buildSecurityHeaders,
  applySecurityHeaders,
  resolveAuth,
} from "./app-helpers";
import { withRlsTenantContext } from "./adapters/tenant-db";
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

import { organizationsRoutes } from "./routes/organizations.routes";

import { observabilityRoutes } from "./routes/observability.routes";
import { poamRoutes } from "./routes/poam.routes";
import { reportingRoutes } from "./routes/reporting.routes";
import { scfRoutes } from "./routes/scf.routes";
import { cdpasRoutes } from "./routes/cdpas.routes";
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
import { registerRoutesForOpenApi } from "./openapi/generator";
import { regulationsRoutes } from "./routes/regulations.routes";
import { riskRoutes } from "./routes/risk.routes";
import { projectionRoutes } from "./routes/projection.routes";
import { assessmentsTemplatesRoutes } from "./routes/assessments-templates.routes";
import { workflowsTemplatesRoutes } from "./routes/workflows-templates.routes";
import { referenceDataRoutes } from "./routes/reference-data.routes";
import { intelligenceRoutes } from "./routes/intelligence.routes";
import { jobsRoutes } from "./routes/jobs.routes";
import { dataSubjectRoutes } from "./routes/data-subject.routes";
import { mcpRoutes } from "./routes/mcp.routes";
import { mcpDocsRoutes } from "./routes/mcp-docs.routes";
import { flowTemplateRoutes } from "./routes/flow-templates.routes";
import { governanceRefRoutes } from "./routes/governance-ref.routes";
import { ropaRoutes } from "./routes/ropa.routes";
import { tpraRoutes } from "./routes/tpra.routes";
import { userOrgsRoutes } from "./routes/user-orgs.routes";
import { adminUsersRoutes } from "./routes/admin-users.routes";
import { adminOrgsRoutes } from "./routes/admin-orgs.routes";
import { madRoutes } from "./routes/mad.routes";
import { maturityRoutes } from "./routes/maturity.routes";
import { riskRegisterRoutes } from "./routes/risk-register.routes";
import { riskCatalogRoutes } from "./routes/risk-catalog.routes";

/**
 * Route path prefixes that are tenant-exempt by convention.
 * These are platform-admin or user-level routes that operate across tenants
 * or don't require an active org context.
 *
 * Prefer setting `tenantRequired: false` explicitly on the route definition
 * instead of expanding this list. This list is a fallback for routes that
 * predate the declarative field.
 */
const TENANT_EXEMPT_PREFIXES = [
  "/api/v1/scf",
  "/api/v1/cdpas",
  "/api/v1/admin/scf",
  "/api/v1/admin/users",
  "/api/v1/admin/security",
  "/api/v1/admin/metrics",
  "/api/v1/admin/usage",
  "/api/v1/users/me",
] as const;

const defaultTenantRequired = (route: RouteDefinition): boolean =>
  Boolean(route.protected) &&
  !TENANT_EXEMPT_PREFIXES.some((prefix) => route.path.startsWith(prefix));

export const routes: RouteDefinition[] = [
  ...openapiRoutes,
  ...mcpRoutes, // MCP server — /mcp
  ...mcpDocsRoutes, // MCP guide  — /docs/mcp
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
  ...cdpasRoutes,
  ...soaRoutes,
  ...emailRoutes,
  ...agentToolsRoutes,
  ...integrationRoutes,
  ...webhookRoutes,
  ...privacyRoutes,
  ...dataSubjectRoutes, // LGPD/GDPR data subject rights: /me/data-export, /me/account
  ...userOrgsRoutes, // User-scoped org listing & activation: /users/me/organizations
  ...socRoutes,
  ...executiveRoutes,
  ...dashboardRoutes,

  ...wellKnownRoutes,
  ...regulationsRoutes,
  ...riskRoutes,
  ...projectionRoutes,
  ...assessmentsTemplatesRoutes,
  ...workflowsTemplatesRoutes,
  ...referenceDataRoutes,
  ...intelligenceRoutes,
  // ── Reference data routes (static, no DB) ──────────────────────
  ...flowTemplateRoutes, // /api/v1/flow-templates
  ...governanceRefRoutes, // /api/v1/governance/{maturity-levels,bg-check-types,...}
  ...ropaRoutes, // /api/v1/ropa/{data-subjects,data-categories,...}
  ...tpraRoutes, // /api/v1/tpra/{questionnaires,tiers,score,...}
  ...adminUsersRoutes, // /api/v1/admin/users — platform admin user management
  ...adminOrgsRoutes, // /api/v1/admin/organizations
  ...madRoutes, // /api/v1/mad — MA&D MADSS transaction assessments
  ...maturityRoutes, // /api/v1/assessments/:id/maturity-versions + /roc-summary
  ...riskRegisterRoutes, // /api/v1/assessments/:id/risk-register (SCR-RMM Step 13)
  ...riskCatalogRoutes, // /api/v1/risk-catalog, /api/v1/threat-catalog (SCR-RMM Task 3)
];

registerRoutesForOpenApi(routes);

const matchRoute = (
  routePath: string,
  actualPath: string,
): Record<string, string> | null => {
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
const buildRouteIndex = (
  allRoutes: RouteDefinition[],
): Map<string, RouteDefinition[]> => {
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

const findRoute = (
  method: string,
  pathname: string,
): RouteDefinition | undefined => {
  const segments = pathname.split("/").filter(Boolean);
  const prefix = `${method}:/${segments.slice(0, 3).join("/")}`;
  const candidates = routeIndex.get(prefix);
  if (candidates) {
    const found = candidates.find((r) => matchRoute(r.path, pathname));
    if (found) return found;
  }
  // Fallback: scan shorter paths (health, root-level)
  return routes.find(
    (r) => r.method === method && matchRoute(r.path, pathname),
  );
};

export const createApp = (
  deps: AppDependencies = createMockRepositories(),
  env?: Partial<Env>,
  auth?: StandardAuth,
) => ({
  async fetch(request: Request, execCtx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const traceId = resolveTraceId(request);

    // ── CORS ────────────────────────────────────────────────
    const allowedOrigins = resolveAllowedOrigins(env);
    const corsHeaders = buildCorsHeaders(request, allowedOrigins);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const securityHeaders = buildSecurityHeaders(corsHeaders, url.pathname);

    let context: RequestContext | undefined;
    // Helper to attach headers to any response
    const withSecurityHeaders = (res: Response): Response => {
      const headers = { ...securityHeaders };
      if (context?.rateLimitHeaders) {
        Object.assign(headers, context.rateLimitHeaders);
      }
      return applySecurityHeaders(res, headers);
    };

    try {
      const route = findRoute(request.method, url.pathname);
      if (!route) {
        throw new ApiError("NOT_FOUND", "Endpoint not found.", 404);
      }

      const params = matchRoute(route.path, url.pathname)!;
      const ctx: RequestContext = {
        request,
        params,
        traceId,
        deps,
        ...(execCtx !== undefined ? { execCtx } : {}),
        ...(env !== undefined ? { env } : {}),
      };
      context = ctx;
      const startedAt = Date.now();

      // ── Auth context resolution ──────────────────────────────
      await resolveAuth(ctx, request, route, env, auth);

      const tenantRequired =
        route.tenantRequired ?? defaultTenantRequired(route);
      await resolveOrganizationContext(ctx, tenantRequired);

      await assertRbac(ctx, route.permissions);
      assertApiKeyScopes(
        ctx,
        route.path,
        request.method,
        route.authRequired ??
          (Boolean(route.protected) ||
            Boolean(route.requireActor) ||
            Boolean(route.permissions?.length)),
      );
      await assertRateLimit(ctx, route.path, env?.STANDARD_CACHE);
      // M3 fix: CSRF verification (after auth, before handler)
      verifyCsrf(ctx);
      await recordAuditEvent(ctx, route.path);

      // ── Idempotency replay ────────────────────────────────────
      if (
        route.idempotencyRequired &&
        !request.headers.get("Idempotency-Key")
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Idempotency-Key header is required for this operation.",
          400,
        );
      }
      const idempotentReplay = await checkIdempotency(
        request,
        ctx.organizationId,
        env?.STANDARD_CACHE,
      );
      if (idempotentReplay) return withSecurityHeaders(idempotentReplay);

      // ── Declarative body validation ───────────────────────────
      // When route defines bodySchema, parse + validate before handler.
      // H8 fix: mark body as consumed so parseJson won't try to read it again.
      if (
        route.bodySchema &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        ctx.validatedBody = await parseJson(request, route.bodySchema);
        ctx._bodyConsumed = true;
      }

      // Dispatch the route handler. When an organization context is present:
      //   1. Wrap in a DB transaction that sets app.current_org_id via SET LOCAL
      //      so PostgreSQL RLS policies (migrations 0028 + 0053) enforce tenant
      //      isolation at the database layer.
      //   2. Pass the transaction client as _db so all handler queries run
      //      within the same transaction and benefit from the SET LOCAL scope.
      //   3. Also set the AsyncLocalStorage tenant context for code that reads
      //      getCurrentOrganizationId() without going through the DB client.
      const response = await (ctx.organizationId && ctx.deps._db
        ? withRlsTenantContext(
            ctx.deps._db,
            ctx.organizationId,
            (tx) => {
              const rlsCtx: RequestContext = {
                ...ctx,
                deps: { ...ctx.deps, _db: tx },
                ...(ctx.tenantScope
                  ? {
                      tenantScope: {
                        ...ctx.tenantScope,
                        db: tx as unknown as typeof ctx.tenantScope.db,
                      },
                    }
                  : {}),
              };
              return runWithTenantContext(
                {
                  organizationId: ctx.organizationId!,
                  ...(ctx.actorId ? { actorId: ctx.actorId } : {}),
                },
                () => route.handler(rlsCtx),
              );
            },
          )
        : ctx.organizationId
          ? runWithTenantContext(
              {
                organizationId: ctx.organizationId,
                ...(ctx.actorId ? { actorId: ctx.actorId } : {}),
              },
              () => route.handler(ctx),
            )
          : route.handler(ctx));

      storeIdempotencyResult(
        request,
        response,
        ctx.organizationId,
        env?.STANDARD_CACHE,
      );
      // Fire-and-forget observability — never blocks the response
      const obsPromise = recordRequestObservability(
        ctx,
        route.path,
        response,
        startedAt,
      ).catch((obsErr) =>
        console.error(
          "[standard:observability] Failed to record metrics:",
          obsErr instanceof Error ? obsErr.message : obsErr,
        ),
      );
      if (execCtx) {
        execCtx.waitUntil(obsPromise);
      }
      return withSecurityHeaders(response);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        const msg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error(
          `[standard:api] Unhandled error on ${request.method} ${url.pathname}: ${msg}`,
          stack,
        );
      }
      return withSecurityHeaders(errorResponse(error, traceId, url.pathname));
    }
  },
});

const notImplemented = (traceId: string): Response =>
  json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Endpoint reserved for future Standard API contract.",
        details: [],
        trace_id: traceId,
      },
    },
    { status: 501 },
  );
