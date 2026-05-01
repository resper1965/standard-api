import { useEffect, useState } from "react";
import { useSession } from "../lib/auth-client";
import { Link } from "react-router-dom";

interface AssessmentSummary {
  id: string;
  name: string;
  state: string;
  framework_id: string;
  created_at: string;
}

export function DashboardPage() {
  const { data: session } = useSession();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/assessments", {
      credentials: "include",
      headers: { "x-aegis-tenant-id": "default" },
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setAssessments((d as { data: AssessmentSummary[] }).data ?? []))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => !["closed", "archived", "cancelled"].includes(a.state)).length,
    approved: assessments.filter((a) => a.state === "closed").length,
    pending: assessments.filter((a) => a.state?.includes("review")).length,
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "User"}
        </h1>
        <p className="page-subtitle">
          Here's an overview of your security assessments
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card-label">Total Assessments</span>
          <span className="stat-card-value">{stats.total}</span>
        </div>
        <div className="stat-card" style={{ "--accent": "var(--warning)" } as React.CSSProperties}>
          <span className="stat-card-label">In Progress</span>
          <span className="stat-card-value">{stats.inProgress}</span>
        </div>
        <div className="stat-card" style={{ "--accent": "var(--success)" } as React.CSSProperties}>
          <span className="stat-card-label">Approved</span>
          <span className="stat-card-value">{stats.approved}</span>
        </div>
        <div className="stat-card" style={{ "--accent": "var(--admin)" } as React.CSSProperties}>
          <span className="stat-card-label">Pending Review</span>
          <span className="stat-card-value">{stats.pending}</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
            Recent Assessments
          </h2>
          <Link to="/assessments" className="btn btn-secondary">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">No assessments yet</h3>
            <p>Create your first security assessment to get started</p>
            <Link to="/assessments" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
              + New Assessment
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Framework</th>
                <th>State</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 5).map((a) => (
                <tr key={a.id}>
                  <td style={{ color: "var(--text)", fontWeight: "var(--weight-medium)" }}>
                    {a.name}
                  </td>
                  <td>{a.framework_id}</td>
                  <td>
                    <span className={`badge badge-${stateColor(a.state)}`}>
                      {a.state}
                    </span>
                  </td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function stateColor(state: string): string {
  if (state.includes("approved") || state === "closed") return "success";
  if (state.includes("review")) return "warning";
  if (state === "failed" || state === "cancelled") return "danger";
  return "info";
}
