// @ts-nocheck -- Zod v4 CI type compat
/**
 * Standard MCP Server â€” Platform Status Tools
 */
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

export async function handleGetPlatformHealth(
  _args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    // Re-use the observability service to get 1h window metrics
    const now = new Date();
    const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Use metrics repository â€” list operational metrics from last 1h
    const recentMetrics = await ctx.deps.observability.metrics.list({
      organization_id: ctx.organizationId ?? undefined,
      limit: 100,
    });
    const inWindow = recentMetrics.filter(
      (m: any) => new Date(m.created_at ?? m.timestamp ?? 0) >= new Date(since),
    );
    const totalRequests = inWindow.reduce(
      (s: number, m: any) => s + (m.total_requests ?? 1),
      0,
    );
    const totalErrors = inWindow.reduce(
      (s: number, m: any) => s + (m.error_count ?? 0),
      0,
    );
    const avgLatency = inWindow.length
      ? inWindow.reduce((s: number, m: any) => s + (m.avg_latency_ms ?? 0), 0) /
        inWindow.length
      : 0;

    return ok({
      status: "operational",
      timestamp: now.toISOString(),
      api: {
        total_requests_1h: totalRequests,
        total_errors_1h: totalErrors,
        avg_latency_ms: Math.round(avgLatency),
        error_rate: totalRequests
          ? ((totalErrors / totalRequests) * 100).toFixed(2) + "%"
          : "0%",
      },
      trace_id: ctx.traceId,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleListSocAlerts(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    // Admin-only: check platformAdmin
    const isPlatformAdmin =
      (ctx.session?.user as Record<string, unknown>)?.["platformAdmin"] ===
      true;
    if (!isPlatformAdmin) {
      return err("This tool requires platform admin privileges.");
    }

    const limit = Math.min(Number(args["limit"] ?? 20), 100);
    const since =
      (args["since"] as string | undefined) ??
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const alerts = await ctx.deps.observability.securityEvents.list({
      organization_id: undefined, // platform admin â€” all tenants
      limit,
    });
    const filtered = alerts.filter(
      (a: any) => new Date(a.created_at ?? 0) >= new Date(since),
    );

    return ok({
      total: filtered.length,
      since,
      alerts: filtered.map((a: any) => ({
        id: a.id,
        event_type: a.event_type ?? a.eventType,
        severity: a.severity,
        message: a.message ?? a.details,
        created_at: a.created_at,
        metadata: a.metadata,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
