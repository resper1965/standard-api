import { createMockRepositories } from "./adapters";
import { ApiError } from "./errors/api-error";
import type { AppDependencies, RouteDefinition } from "./http";
import { json, type RequestContext } from "./http";
import { recordAuditPlaceholder } from "./middleware/audit.middleware";
import { resolveActorContext } from "./middleware/auth.middleware";
import { errorResponse } from "./middleware/error.middleware";
import { assertRateLimitPlaceholder } from "./middleware/rate-limit.middleware";
import { recordRequestObservability } from "./middleware/request-observability.middleware";
import { assertRbac } from "./middleware/rbac.middleware";
import { resolveTenantContext } from "./middleware/tenant.middleware";
import { resolveTraceId } from "./middleware/trace.middleware";
import { agentRuntimeRoutes } from "./routes/agent-runtime.routes";
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
import { tenantsRoutes } from "./routes/tenants.routes";
import { workflowRoutes } from "./routes/workflow.routes";

const routes: RouteDefinition[] = [
  ...healthRoutes,
  ...tenantsRoutes,
  ...organizationsRoutes,
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
  ...soaRoutes
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

export const createApp = (deps: AppDependencies = createMockRepositories()) => ({
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const traceId = resolveTraceId(request);

    try {
      const route = routes.find((candidate) => candidate.method === request.method && matchRoute(candidate.path, url.pathname));
      if (!route) {
        throw new ApiError("NOT_FOUND", "Endpoint not found.", 404);
      }

      const params = matchRoute(route.path, url.pathname)!;
      const context: RequestContext = { request, params, traceId, deps };
      const startedAt = Date.now();
      const tenantRequired = route.tenantRequired ?? (Boolean(route.protected) && !route.path.startsWith("/api/v1/scf") && !route.path.startsWith("/api/v1/admin/scf"));
      resolveTenantContext(context, tenantRequired);
      const authRequired = route.authRequired ?? (Boolean(route.requireActor) || Boolean(route.permissions?.length));
      await resolveActorContext(context, authRequired, Boolean(route.requireActor));
      await assertRbac(context, route.permissions);
      await assertRateLimitPlaceholder(context, route.path);
      await recordAuditPlaceholder(context, route.path);

      const response = await route.handler(context);
      await recordRequestObservability(context, route.path, response, startedAt);
      return response;
    } catch (error) {
      return errorResponse(error, traceId);
    }
  }
});

export const notImplemented = (traceId: string): Response =>
  json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Endpoint reserved for future Aegis API contract.",
        details: [],
        trace_id: traceId
      }
    },
    { status: 501 }
  );
