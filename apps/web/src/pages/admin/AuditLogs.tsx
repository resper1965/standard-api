import { useEffect, useState } from "react";
import { api } from "../../lib/api";

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Mock fetch
      const res = await api<{ data: AuditLog[] }>("/api/observability/audit", {
        method: "GET"
      }).catch(() => ({ data: [
        { id: "log_1", action: "assessment_created", actorId: "admin", targetType: "assessment", targetId: "ass_123", createdAt: new Date() },
        { id: "log_2", action: "user_invited", actorId: "admin", targetType: "user", targetId: "usr_456", createdAt: new Date(Date.now() - 3600000) }
      ]})); 
      setLogs(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track all system events and user actions</p>
        </div>
        <button className="btn" onClick={fetchLogs}>Refresh</button>
      </div>

      <div className="card">
        {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Timestamp</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Action</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Actor</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="table-row">
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}><code>{l.action}</code></td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{l.actorId}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{l.targetType}: {l.targetId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
