import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Assessment } from "../components/AssessmentCard";

interface LifecycleEvent {
  event_type: string;
  previous_state: string;
  next_state: string;
  timestamp: string;
  reason?: string;
  actor_id: string;
}

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      try {
        const [assRes, eventsRes] = await Promise.all([
          api<Assessment>(`/api/v1/assessments/${id}`),
          api<{ data: LifecycleEvent[] }>(`/api/v1/assessments/${id}/events`)
        ]);
        setAssessment(assRes);
        setEvents(eventsRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!assessment) return <div>Assessment not found.</div>;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Link to="/assessments" style={{ color: "var(--accent)", textDecoration: "none" }}>&larr; Back to Assessments</Link>
      </div>

      <div className="card" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <h1 style={{ margin: 0 }}>{assessment.name}</h1>
          <span className="badge badge-warning" style={{ fontSize: "1rem" }}>{assessment.state.replace(/_/g, " ")}</span>
        </div>
        <p style={{ color: "var(--text-muted)", margin: "4px 0" }}>Framework: <strong>{assessment.scf_version_id}</strong></p>
        <p style={{ color: "var(--text-muted)", margin: "4px 0" }}>Assessment ID: <span style={{ fontFamily: "monospace" }}>{assessment.assessment_id}</span></p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div className="card">
          <h2>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link to={`/gap-analysis?assessment=${assessment.assessment_id}`} className="btn">View Gap Analysis</Link>
            <Link to={`/documents?assessment=${assessment.assessment_id}`} className="btn">Manage Documents</Link>
          </div>
        </div>

        <div className="card">
          <h2>Lifecycle Timeline</h2>
          {events.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No events recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {events.map((ev, i) => (
                <div key={i} style={{ borderLeft: "2px solid var(--border)", paddingLeft: "16px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>{ev.event_type.replace(/_/g, " ")}</p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {new Date(ev.timestamp).toLocaleString()}
                  </p>
                  {ev.reason && <p style={{ margin: 0, fontSize: "0.875rem" }}>Note: {ev.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
