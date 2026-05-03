import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

interface ReportVersion {
  id: string; // from report_version_id
  report_version_id: string;
  report_type: string;
  status: string;
  created_at: string;
}

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  
  const [reports, setReports] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: ReportVersion[] }>(`/api/v1/assessments/${assessmentId}/reports`);
      setReports(res.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [assessmentId]);

  const generateReport = async () => {
    if (!assessmentId) return;
    setGenerating(true);
    setError(null);
    try {
      await api(`/api/v1/assessments/${assessmentId}/reports/draft`, {
        method: "POST",
        body: JSON.stringify({
          report_type: "full_assessment",
          options: { include_evidence: true }
        })
      });
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        {assessmentId && (
          <button className="btn btn-primary" onClick={generateReport} disabled={generating || loading}>
            {generating ? "Generating..." : "Generate New Report"}
          </button>
        )}
      </div>

      {!assessmentId ? (
        <div className="card" style={{ marginBottom: "24px", color: "var(--warning)" }}>
          <p>Please select an assessment from the Assessments page to view or generate its reports.</p>
        </div>
      ) : (
        <div className="card">
          {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
          
          <h2>Generated Reports</h2>
          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No reports have been generated yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Date</th>
                    <th style={{ textAlign: "right", padding: "12px", borderBottom: "1px solid var(--border)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={r.report_version_id || i} className="table-row">
                      <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", textTransform: "capitalize" }}>
                        {r.report_type.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                        <span className={`badge ${r.status === "approved" || r.status === "final" ? "badge-success" : "badge-warning"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                        <button className="btn" onClick={() => alert("Download not implemented in MVP viewer yet")}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
