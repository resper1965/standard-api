import { Link } from "react-router-dom";

export interface Assessment {
  assessment_id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  state: string;
  scf_version_id: string;
  trace_id: string;
}

export function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const isCompleted = assessment.state === "closed" || assessment.state === "archived";
  const isInProgress = !isCompleted && assessment.state !== "draft";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>{assessment.name}</h3>
        <span className={`badge ${isCompleted ? "badge-success" : isInProgress ? "badge-warning" : ""}`}>
          {assessment.state.replace(/_/g, " ")}
        </span>
      </div>
      
      <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>
        <p style={{ margin: "4px 0" }}><strong>Framework:</strong> {assessment.scf_version_id}</p>
        <p style={{ margin: "4px 0" }}><strong>ID:</strong> {assessment.assessment_id.split("-")[0]}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link to={`/assessments/${assessment.assessment_id}`} className="btn">
          View Details
        </Link>
      </div>
    </div>
  );
}
