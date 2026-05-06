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
    handler: ({ traceId }) => json({ ok: true, service: "standard-api-standard", trace_id: traceId })
  }
];

