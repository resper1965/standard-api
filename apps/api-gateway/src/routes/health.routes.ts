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

      // Operational metrics: best-effort with 250ms timeout.
      // If metrics DB query is slow, health returns without operational data.
      // Prevents metrics aggregation from blocking health checks (Neon P95 can be ~600ms).
      try {
        if (deps.observability?.metrics) {
          const METRICS_TIMEOUT_MS = 250;

          const metricsPromise = (async () => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const allMetrics = await deps.observability.metrics.list({ limit: 500 });
            const recent = allMetrics.filter((m: { created_at?: string }) => (m.created_at ?? "") >= oneHourAgo);

            const requests = recent.filter((m: { metric_name: string }) => m.metric_name === "request_count");
            const durations = recent.filter((m: { metric_name: string }) => m.metric_name === "request_duration_ms");
            const errors = recent.filter((m: { metric_name: string }) =>
              ["error_count", "auth_error_count", "forbidden_error_count"].includes(m.metric_name)
            );
            const scanBlocked = recent.filter((m: { metric_name: string; dimensions?: Record<string, unknown> }) =>
              m.metric_name === "malware.scan.result" && m.dimensions?.["outcome"] === "blocked"
            );
            const dlqEvents = recent.filter((m: { metric_name: string; dimensions?: Record<string, unknown> }) =>
              m.metric_name === "queue.processing.duration_ms" && m.dimensions?.["outcome"] === "dlq"
            );
            const totalDuration = durations.reduce((sum: number, m: { metric_value: number }) => sum + m.metric_value, 0);

            return {
              window: "1h",
              total_requests: requests.reduce((sum: number, m: { metric_value: number }) => sum + m.metric_value, 0),
              total_errors: errors.reduce((sum: number, m: { metric_value: number }) => sum + m.metric_value, 0),
              avg_latency_ms: durations.length > 0 ? Math.round(totalDuration / durations.length) : 0,
              scan_blocked_count: scanBlocked.length,
              dlq_count: dlqEvents.length,
            };
          })();

          const timeoutPromise = new Promise<null>(resolve =>
            setTimeout(() => resolve(null), METRICS_TIMEOUT_MS)
          );

          const result = await Promise.race([metricsPromise, timeoutPromise]);
          health["operational"] = result ?? { status: "timeout" };
        }
      } catch {
        // Observability unavailable — basic health is still valid
        health["operational"] = { status: "unavailable" };
      }

      return json(health);
    }
  },
  {
    method: "GET",
    path: "/api/health/auth",
    handler: async ({ traceId, deps }) => {
      // Verifies Standard Native Auth stack health:
      // 1. DB connectivity (same lightweight probe as /health)
      // 2. Reports auth version for monitoring dashboards
      // Used by: CI deploy gate, external uptime monitoring, runbooks
      const start = Date.now();
      let dbStatus = "unknown";
      try {
        await deps.organizations.get(
          "00000000-0000-0000-0000-000000000000",
          "00000000-0000-0000-0000-000000000000"
        );
        dbStatus = "connected";
      } catch {
        dbStatus = "unreachable";
      }
      const latencyMs = Date.now() - start;
      const isHealthy = dbStatus === "connected";

      return json(
        {
          status: isHealthy ? "ok" : "degraded",
          auth: "standard-native-auth@1.6.11",
          db: dbStatus,
          latency_ms: latencyMs,
          trace_id: traceId,
        },
        { status: isHealthy ? 200 : 503 }
      );
    }
  }
];

