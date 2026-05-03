import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export function CreateAssessmentModal({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  const [name, setName] = useState("");
  const [scfVersionId, setScfVersionId] = useState("scf_2024_1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Find org id from current session (simplification: assume tenant handles it via API, or we pass it)
      const res = await api<{ assessment_id: string }>("/api/v1/assessments", {
        method: "POST",
        body: JSON.stringify({
          name,
          scf_version_id: scfVersionId,
          organization_id: "org_default" // The gateway usually needs org_id
        }),
      });
      onCreated();
      navigate(`/assessments/${res.assessment_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create assessment");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>New Assessment</h2>
        {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>Assessment Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Q3 Compliance Audit"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>Framework Version</label>
            <select 
              value={scfVersionId} 
              onChange={e => setScfVersionId(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            >
              <option value="scf_2024_1">SCF 2024.1</option>
              <option value="scf_2023_2">SCF 2023.2</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
