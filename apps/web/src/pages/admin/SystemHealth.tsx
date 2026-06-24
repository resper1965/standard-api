import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Wifi, WifiOff } from "lucide-react";
import { useHealthRaw } from "@/lib/queries";
import { API_URL } from "@/lib/config";

type ServiceStatus = { name: string; status: "operational" | "degraded" | "down" };

type HealthState = {
  overall: "operational" | "degraded" | "down";
  version: string;
  timestamp: string;
  services: ServiceStatus[];
  connectionError: boolean;
  operational: {
    window: string;
    total_requests: number;
    total_errors: number;
    avg_latency_ms: number;
    scan_blocked_count: number;
    dlq_count: number;
  } | null;
};

function deriveHealthState(
  basic: Record<string, unknown> | null,
  detailed: Record<string, unknown> | null
): HealthState | null {
  if (!basic && !detailed) return null;

  const gatewayUp = basic?.ok === true || detailed?.ok === true;
  const dbUp = basic?.database === "connected";
  const r2Connected = basic?.r2 === "connected" || detailed?.r2 === "connected";
  const r2Disconnected = basic?.r2 === "disconnected" || detailed?.r2 === "disconnected";

  const services: ServiceStatus[] = [
    { name: "API Gateway", status: gatewayUp ? "operational" : "down" },
    { name: "Database", status: dbUp ? "operational" : "down" },
    { name: "Auth (Standard Native Auth)", status: gatewayUp ? "operational" : "down" },
    {
      name: "Storage (R2)",
      status: r2Connected
        ? "operational"
        : r2Disconnected
          ? "down"
          : ("unknown" as unknown as "degraded"),
    },
  ];

  const hasDown = services.some(s => s.status === "down");
  const hasDegraded = services.some(s => s.status === "degraded");

  return {
    overall: hasDown ? (gatewayUp ? "degraded" : "down") : hasDegraded ? "degraded" : "operational",
    version: (detailed?.service || basic?.service || "standard-api") as string,
    timestamp: (detailed?.timestamp || basic?.timestamp || new Date().toISOString()) as string,
    services,
    connectionError: false,
    operational: (detailed?.operational ?? null) as HealthState["operational"],
  };
}

function buildDownState(): HealthState {
  return {
    overall: "down",
    version: "—",
    timestamp: new Date().toISOString(),
    services: [
      { name: "API Gateway", status: "down" },
      { name: "Database", status: "down" },
      { name: "Auth (Standard Native Auth)", status: "down" },
      { name: "Storage (R2)", status: "down" },
    ],
    connectionError: true,
    operational: null,
  };
}

export function AdminSystemHealth() {
  useDocumentTitle("System Health");

  const { data, isLoading, isFetching, error, refetch } = useHealthRaw(API_URL);

  const loading = isLoading || isFetching;
  const connectionError = !data?.basic && !data?.detailed && !isLoading;

  const health: HealthState | null = error || connectionError
    ? buildDownState()
    : data
      ? deriveHealthState(data.basic, data.detailed)
      : null;

  const errorMsg = connectionError
    ? "Cannot reach the API Gateway. The Worker may be down or unreachable."
    : error instanceof Error ? `Network error: ${error.message}` : null;

  const statusBadge = (status: string) => {
    const style: React.CSSProperties = status === "operational"
      ? { background: 'var(--ds-success-light)', color: 'var(--ds-success)' }
      : status === "degraded"
        ? { background: 'var(--ds-warning-light)', color: 'var(--ds-warning)' }
        : undefined as unknown as React.CSSProperties;
    const className = (!style) ? "bg-destructive/10 text-destructive" : "";
    const label = status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Down";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`} style={style}>{label}</span>;
  };

  const overallIcon = (overall: string) => {
    if (overall === "operational") return <CheckCircle2 className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--ds-success)' }} />;
    if (overall === "degraded") return <AlertTriangle className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--ds-warning)' }} />;
    return <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />;
  };

  const overallLabel = (overall: string) => {
    if (overall === "operational") return "All Systems Operational";
    if (overall === "degraded") return "System Degraded";
    return "System Down";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Real-time API and service status" />

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={loading}
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-3">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{errorMsg}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Endpoint: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{API_URL}/health</code>
            </p>
          </div>
        </div>
      )}

      {!health && loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* Overall status */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="flex items-center gap-4 py-5">
              {overallIcon(health.overall)}
              <div>
                <p className="font-semibold text-lg leading-none">
                  {overallLabel(health.overall)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60 shadow-none">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">API Version</p>
                <p className="text-xl font-bold stat-number">{health.version}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Uptime</p>
                <p className="text-xl font-bold stat-number text-muted-foreground">Not tracked</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Avg Latency</p>
                <p className="text-xl font-bold stat-number">{health.operational ? `${health.operational.avg_latency_ms}ms` : "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Connection error hint */}
          {health.connectionError && (
            <Card className="border-border/60 shadow-none" style={{ borderColor: 'var(--ds-warning)', background: 'var(--ds-warning-light)' }}>
              <CardContent className="py-4 flex items-start gap-3">
                <WifiOff className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--ds-warning)' }} />
                <div className="text-sm">
                  <p className="font-medium" style={{ color: 'var(--ds-warning)' }}>Connection Failed</p>
                  <p className="text-muted-foreground mt-1">
                    The Cloudflare Worker at <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{API_URL}</code> is not responding.
                    Check the Cloudflare Dashboard → Workers & Pages to verify the deployment status.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operational metrics */}
          {health.operational && (
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Operational Metrics (last {health.operational.window})</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40">
                  <div className="px-4 py-4">
                    <p className="text-xs text-muted-foreground">Requests</p>
                    <p className="text-lg font-bold stat-number mt-0.5">{health.operational.total_requests}</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs text-muted-foreground">Errors</p>
                    <p className={`text-lg font-bold stat-number mt-0.5 ${health.operational.total_errors > 0 ? "text-destructive" : ""}`}>
                      {health.operational.total_errors}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs text-muted-foreground">Scans Blocked</p>
                    <p className="text-lg font-bold stat-number mt-0.5">{health.operational.scan_blocked_count}</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs text-muted-foreground">DLQ Events</p>
                    <p className={`text-lg font-bold stat-number mt-0.5 ${health.operational.dlq_count > 0 ? "text-warning" : ""}`}>
                      {health.operational.dlq_count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services table */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-border/60">
                <h3 className="text-sm font-semibold">Core Services</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.services.map((svc) => (
                    <TableRow key={svc.name}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {svc.status === "operational"
                          ? <Wifi className="h-3.5 w-3.5 text-success" />
                          : <WifiOff className="h-3.5 w-3.5 text-destructive" />
                        }
                        {svc.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {svc.status === ("unknown" as unknown as "degraded")
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">Not monitored</span>
                          : statusBadge(svc.status)
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-border/60 shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            No health data available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
