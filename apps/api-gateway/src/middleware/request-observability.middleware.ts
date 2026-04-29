import { MetricsService, StructuredLogger } from "@aegis/observability";
import type { RequestContext } from "../http";

const logger = new StructuredLogger();

export const recordRequestObservability = async (
  context: RequestContext,
  route: string,
  response: Response,
  startedAt: number
): Promise<void> => {
  const durationMs = Date.now() - startedAt;
  const metrics = new MetricsService(context.deps.observability);
  await metrics.record({
    tenant_id: context.tenantId,
    organization_id: context.securityTenant?.organization_id,
    assessment_id: context.params.assessmentId,
    metric_name: "request_count",
    metric_type: "counter",
    metric_value: 1,
    unit: "count",
    dimensions: { route, method: context.request.method, status: String(response.status) },
    trace_id: context.traceId
  });
  await metrics.record({
    tenant_id: context.tenantId,
    organization_id: context.securityTenant?.organization_id,
    assessment_id: context.params.assessmentId,
    metric_name: "request_duration_ms",
    metric_type: "histogram",
    metric_value: durationMs,
    unit: "ms",
    dimensions: { route, method: context.request.method },
    trace_id: context.traceId
  });
  if (response.status >= 400) {
    await metrics.record({
      tenant_id: context.tenantId,
      organization_id: context.securityTenant?.organization_id,
      assessment_id: context.params.assessmentId,
      metric_name: response.status === 401 ? "auth_error_count" : response.status === 403 ? "forbidden_error_count" : "error_count",
      metric_type: "counter",
      metric_value: 1,
      unit: "count",
      dimensions: { route, method: context.request.method, status: String(response.status) },
      trace_id: context.traceId
    });
  }
  logger.log({
    level: response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info",
    message: "api_request_completed",
    service: "api-gateway",
    module: "request",
    environment: "local",
    trace_id: context.traceId,
    tenant_id: context.tenantId,
    organization_id: context.securityTenant?.organization_id,
    assessment_id: context.params.assessmentId,
    metadata: { route, method: context.request.method, status: response.status, duration_ms: durationMs }
  });
};
