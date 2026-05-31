import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Wifi, WifiOff } from "lucide-react";

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

function buildDownState(connectionError: boolean): HealthState {
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
    connectionError,
    operational: null,
  };
}

export function AdminSystemHealth() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchHealth = async () => {
    const currentId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [basicRes, detailedRes] = await Promise.allSettled([
        fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : null),
        fetch(`${API_URL}/api/v1/health`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : null),
      ]);

      // Stale check — another fetch was triggered while we were waiting
      if (currentId !== fetchIdRef.current) return;

      const basic = basicRes.status === "fulfilled" ? basicRes.value : null;
      const detailed = detailedRes.status === "fulfilled" ? detailedRes.value : null;

      // Both endpoints unreachable (rejected or returned null)
      const bothUnreachable = !basic && !detailed;

      if (bothUnreachable) {
        setError("Cannot reach the API Gateway. The Worker may be down or unreachable.");
        setHealth(buildDownState(true));
        return;
      }

      // Determine service statuses from actual API fields
      const gatewayUp = basic?.ok === true || detailed?.ok === true;
      const dbUp = basic?.database === "connected";

      const services: ServiceStatus[] = [
        { name: "API Gateway", status: gatewayUp ? "operational" : "down" },
        { name: "Database", status: dbUp ? "operational" : "down" },
        { name: "Auth (Standard Native Auth)", status: gatewayUp ? "operational" : "down" },
        // R2 health is not checked by the /health endpoint — status cannot be confirmed
        { name: "Storage (R2)", status: "unknown" as unknown as "degraded" },
      ];

      const hasDown = services.some(s => s.status === "down");
      const hasDegraded = services.some(s => s.status === "degraded");

      setHealth({
        overall: hasDown ? (gatewayUp ? "degraded" : "down") : hasDegraded ? "degraded" : "operational",
        version: detailed?.service || basic?.service || "standard-api",
        timestamp: detailed?.timestamp || basic?.timestamp || new Date().toISOString(),
        services,
        connectionError: false,
        operational: detailed?.operational ?? null,
      });
    } catch (e) {
      if (currentId !== fetchIdRef.current) return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Network error: ${msg}`);
      setHealth(buildDownState(true));
    } finally {
      if (currentId === fetchIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusBadge = (status: string) => {
    const styles = status === "operational"
      ? "bg-success/10 text-success"
      : status === "degraded"
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";
    const label = status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Down";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles}`}>{label}</span>;
  };

  const overallIcon = (overall: string) => {
    if (overall === "operational") return <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />;
    if (overall === "degraded") return <AlertTriangle className="h-8 w-8 text-warning flex-shrink-0" />;
    return <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />;
  };

  const overallLabel = (overall: string) => {
    if (overall === "operational") return "All Systems Operational";
    if (overall === "degraded") return "System Degraded";
    return "System Down";
  };

  return (
    <div className="space-y-6">

      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-3">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
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
                <p className="text-xl font-bold stat-number">{health.operational ? `${health.operational.avg_latency_ms}ms` : "\u2014"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Connection error hint */}
          {health.connectionError && (
            <Card className="border-warning/30 shadow-none bg-warning/5">
              <CardContent className="py-4 flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Connection Failed</p>
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

