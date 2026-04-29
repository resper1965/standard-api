import type { RouteDefinition } from "../http";
import { json } from "../http";

export const healthRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/health",
    handler: ({ traceId }) => json({ ok: true, service: "aegis-api-standard", trace_id: traceId })
  },
  {
    method: "GET",
    path: "/api/v1/health",
    handler: ({ traceId }) => json({ ok: true, service: "aegis-api-standard", trace_id: traceId })
  }
];
