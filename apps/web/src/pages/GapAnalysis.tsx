import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { GapTable } from "../components/GapTable";
import type { GapFinding } from "../components/GapTable";

export function GapAnalysisPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  
  const [findings, setFindings] = useState<GapFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGapAnalysis = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      // Get the latest Gap Analysis version
      const versionsRes = await api<{ data: { id: string }[] }>(`/api/v1/assessments/${assessmentId}/gap-analysis`);
      const versions = versionsRes.data || [];
      if (versions.length > 0) {
        const latestVersionId = versions[0].id;
        const findingsRes = await api<{ data: GapFinding[] }>(`/api/v1/gap-analysis/${latestVersionId}/findings`);
        setFindings(findingsRes.data || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch gap analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
  }, [assessmentId]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ margin: 0 }}>Gap Analysis</h1>
      </div>

      {!assessmentId ? (
        <div className="card" style={{ marginBottom: "24px", color: "var(--warning)" }}>
          <p>Please select an assessment from the Assessments page to view its gap analysis.</p>
        </div>
      ) : (
        <div className="card">
          {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
          {loading ? (
            <p>Loading gap analysis data...</p>
          ) : (
            <GapTable findings={findings} />
          )}
        </div>
      )}
    </div>
  );
}
