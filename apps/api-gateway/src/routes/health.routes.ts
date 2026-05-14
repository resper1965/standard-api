import type { RouteDefinition } from "../http";
import { json } from "../http";

export const healthRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/health",
    handler: async ({ traceId, deps }) => {
      let dbStatus = "unknown";
      try {
        await deps.organizations.get("00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000");
        dbStatus = "connected";
      } catch (error) {
        dbStatus = "disconnected";
      }
      return json({ ok: true, service: "standard-api-standard", database: dbStatus, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/health",
    handler: async ({ traceId, deps }) => {
      // Basic health
      const health: Record<string, unknown> = {
        ok: true,
        service: "standard-api-standard",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
      };

      // Operational metrics (best-effort from observability deps)
      try {
        if (deps.observability?.metrics) {
          const allMetrics = await deps.observability.metrics.list({ limit: 500 });
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const recent = allMetrics.filter(m => (m.created_at ?? "") >= oneHourAgo);

          const requests = recent.filter(m => m.metric_name === "request_count");
          const durations = recent.filter(m => m.metric_name === "request_duration_ms");
          const errors = recent.filter(m => m.metric_name === "error_count"
            || m.metric_name === "auth_error_count"
            || m.metric_name === "forbidden_error_count");
          const scanBlocked = recent.filter(m =>
            m.metric_name === "malware.scan.result" && m.dimensions?.outcome === "blocked");
          const dlqEvents = recent.filter(m =>
            m.metric_name === "queue.processing.duration_ms" && m.dimensions?.outcome === "dlq");

          const totalDuration = durations.reduce((sum, m) => sum + m.metric_value, 0);

          health.operational = {
            window: "1h",
            total_requests: requests.reduce((sum, m) => sum + m.metric_value, 0),
            total_errors: errors.reduce((sum, m) => sum + m.metric_value, 0),
            avg_latency_ms: durations.length > 0 ? Math.round(totalDuration / durations.length) : 0,
            scan_blocked_count: scanBlocked.length,
            dlq_count: dlqEvents.length,
          };
        }
      } catch {
        // Observability unavailable — basic health is still valid
        health.operational = { status: "unavailable" };
      }

      return json(health);
    }
  }
];

