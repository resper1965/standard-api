import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssessmentCard } from "../components/AssessmentCard";
import type { Assessment } from "../components/AssessmentCard";
import { CreateAssessmentModal } from "../components/CreateAssessmentModal";

export function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api<{ data: Assessment[] }>("/api/v1/assessments");
      setAssessments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Assessments</h1>
          <p className="page-subtitle">Manage your security and compliance assessments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Assessment
        </button>
      </div>

      {loading ? (
        <p>Loading assessments...</p>
      ) : assessments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>No assessments found.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Start Your First Assessment
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {assessments.map(assessment => (
            <AssessmentCard key={assessment.assessment_id} assessment={assessment} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateAssessmentModal 
          onClose={() => setShowModal(false)} 
          onCreated={() => {
            setShowModal(false);
            fetchAssessments();
          }} 
        />
      )}
    </>
  );
}
