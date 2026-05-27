 
export interface GapFinding {
  control_id: string;
  status: "compliant" | "partial" | "non_compliant" | "not_assessed";
  description: string;
  evidence_links?: string[];
  recommendation?: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
}

export function GapTable({ findings }: { findings: GapFinding[] }) {
  if (!findings || findings.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No gap findings available.</p>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant": return <span className="badge badge-success">Compliant</span>;
      case "partial": return <span className="badge badge-warning">Partial</span>;
      case "non_compliant": return <span className="badge badge-danger">Non Compliant</span>;
      default: return <span className="badge">Not Assessed</span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical": return <span style={{ color: "#ef4444", fontWeight: "bold" }}>Critical</span>;
      case "high": return <span style={{ color: "#f97316", fontWeight: "bold" }}>High</span>;
      case "medium": return <span style={{ color: "#eab308", fontWeight: "bold" }}>Medium</span>;
      case "low": return <span style={{ color: "#3b82f6", fontWeight: "bold" }}>Low</span>;
      default: return <span>Info</span>;
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Control ID</th>
            <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Status</th>
            <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Severity</th>
            <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => (
            <tr key={`${f.control_id}_${i}`} className="table-row">
              <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}>{f.control_id}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{getStatusBadge(f.status)}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{getSeverityBadge(f.severity)}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", maxWidth: "400px" }}>
                <p style={{ margin: "0 0 8px 0" }}>{f.description}</p>
                {f.recommendation && (
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}><strong>Rec:</strong> {f.recommendation}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
