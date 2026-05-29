import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";

type AuditLog = {
  id: string;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string;
  metadata?: any;
  createdAt: Date;
};

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const res = await api<{ data: AuditLog[] }>("/api/v1/admin/security-events", { method: "GET" });
      setLogs(res.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch audit logs";
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("permission")) {
        setForbidden(true);
      } else {
        setError(msg);
      }
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          {forbidden && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 text-amber-500/70" />
              <p className="text-sm font-medium">Insufficient permissions</p>
              <p className="text-xs text-center max-w-xs">
                Your account needs the <code className="bg-muted px-1 py-0.5 rounded text-[10px]">admin</code> role
                to view security events. Contact your platform administrator.
              </p>
            </div>
          )}
          {error && <div className="p-4 text-sm text-destructive">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !forbidden && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-10">
                      No security events found.
                    </TableCell>
                  </TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground text-sm">{new Date(l.createdAt).toLocaleString()}</TableCell>
                    <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{l.action}</code></TableCell>
                    <TableCell className="text-sm">{l.actorId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.targetType}: {l.targetId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
