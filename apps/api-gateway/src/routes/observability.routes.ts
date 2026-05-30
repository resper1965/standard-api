import { AuditLogQuerySchema, MetricsQuerySchema, SecurityEventQuerySchema, UsageQuerySchema } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";

const parseQuery = <T extends { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }>(
  request: Request,
  schema: T
) => {
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid query parameters.", 400, [parsed.error]);
  return parsed.data as any;
};

export const observabilityRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/audit-logs",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const assessment = await deps.assessments.withTenant(tenantId!).get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const query = parseQuery(request, AuditLogQuerySchema);
      const data = await deps.observability.auditEvents.list({
        tenant_id: tenantId,
        assessment_id: assessment.assessment_id,
        limit: query.limit
      });
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/audit-logs/:auditLogId",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const record = await deps.observability.auditEvents.get(routeParam(params, "auditLogId"));
      if (!record || record.tenant_id !== tenantId) throw new ApiError("NOT_FOUND", "Audit log not found.", 404);
      return json({ ...record, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/admin/security-events",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, SecurityEventQuerySchema);
      const data = await deps.observability.securityEvents.list({ tenant_id: tenantId, limit: query.limit });
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/admin/security-events/:securityEventId",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ deps, params, tenantId, traceId }) => {
      const record = await deps.observability.securityEvents.get(routeParam(params, "securityEventId"));
      if (!record || record.tenant_id !== tenantId) throw new ApiError("NOT_FOUND", "Security event not found.", 404);
      return json({ ...record, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/metrics",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const assessment = await deps.assessments.withTenant(tenantId!).get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const query = parseQuery(request, MetricsQuerySchema);
      const data = await deps.observability.metrics.list({
        tenant_id: tenantId,
        assessment_id: assessment.assessment_id,
        limit: query.limit
      });
      return json({
        data: query.metric_name ? data.filter((metric) => metric.metric_name === query.metric_name) : data,
        trace_id: traceId
      });
    }
  },
  {
    method: "GET",
    path: "/api/v1/admin/metrics/operational",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, MetricsQuerySchema);
      const data = await deps.observability.metrics.list({ tenant_id: tenantId, limit: query.limit });
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/usage",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const assessment = await deps.assessments.withTenant(tenantId!).get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const query = parseQuery(request, UsageQuerySchema);
      const usage = await deps.observability.usage.list({ tenant_id: tenantId, assessment_id: assessment.assessment_id, limit: query.limit });
      const agent_usage = await deps.observability.agentUsage.list({ tenant_id: tenantId, assessment_id: assessment.assessment_id, limit: query.limit });
      return json({ usage, agent_usage, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/tenants/:tenantId/usage",
    protected: true,
    permissions: ["tenant:read"],
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      if (routeParam(params, "tenantId") !== tenantId) throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
      const query = parseQuery(request, UsageQuerySchema);
      const usage = await deps.observability.usage.list({ tenant_id: tenantId, limit: query.limit });
      return json({ usage, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/admin/usage",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, UsageQuerySchema);
      const usage = await deps.observability.usage.list({ tenant_id: tenantId, limit: query.limit });
      const agent_usage = await deps.observability.agentUsage.list({ tenant_id: tenantId, limit: query.limit });
      return json({ usage, agent_usage, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/observability/audit-logs",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, AuditLogQuerySchema);
      const data = await deps.observability.auditEvents.list({ tenant_id: tenantId, limit: query.limit });
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/observability/audit",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, AuditLogQuerySchema);
      const data = await deps.observability.auditEvents.list({ tenant_id: tenantId, limit: query.limit });
      return json(
        { data, trace_id: traceId },
        {
          headers: {
            "Warning": '299 - "This endpoint is deprecated. Use /api/v1/observability/audit-logs instead."'
          }
        }
      );
    }
  },
  {
    method: "GET",
    path: "/api/observability/audit",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, AuditLogQuerySchema);
      const data = await deps.observability.auditEvents.list({ tenant_id: tenantId, limit: query.limit });
      return json(
        { data, trace_id: traceId },
        {
          headers: {
            "Warning": '299 - "This endpoint is deprecated. Use /api/v1/observability/audit-logs instead."'
          }
        }
      );
    }
  },
  {
    method: "GET",
    path: "/api/v1/observability/metrics",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, MetricsQuerySchema);
      const data = await deps.observability.metrics.list({ tenant_id: tenantId, limit: query.limit });
      return json(
        { data, trace_id: traceId },
        {
          headers: {
            "Warning": '299 - "This endpoint is deprecated. Use /api/v1/admin/metrics/operational instead."'
          }
        }
      );
    }
  },
  {
    method: "GET",
    path: "/api/v1/observability/security-events",
    protected: true,
    permissions: ["admin:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, SecurityEventQuerySchema);
      const data = await deps.observability.securityEvents.list({ tenant_id: tenantId, limit: query.limit });
      return json(
        { data, trace_id: traceId },
        {
          headers: {
            "Warning": '299 - "This endpoint is deprecated. Use /api/v1/admin/security-events instead."'
          }
        }
      );
    }
  },
  {
    method: "GET",
    path: "/api/v1/observability/usage",
    protected: true,
    permissions: ["tenant:read"],
    handler: async ({ request, deps, tenantId, traceId }) => {
      const query = parseQuery(request, UsageQuerySchema);
      const usage = await deps.observability.usage.list({ tenant_id: tenantId, limit: query.limit });
      const agent_usage = await deps.observability.agentUsage.list({ tenant_id: tenantId, limit: query.limit });
      return json(
        { usage, agent_usage, trace_id: traceId },
        {
          headers: {
            "Warning": `299 - "This endpoint is deprecated. Use /api/v1/tenants/${tenantId}/usage instead."`
          }
        }
      );
    }
  }
];



