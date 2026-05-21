import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

interface ScfVersion {
  scf_version_id: string;
  version_label: string;
}

export function CreateAssessmentModal({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  const [name, setName] = useState("");
  const [scfVersionId, setScfVersionId] = useState("");
  const [scfVersions, setScfVersions] = useState<ScfVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch available SCF versions on mount
  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await api<{ data: ScfVersion[] }>("/api/v1/scf/versions");
        const versions = res.data ?? [];
        setScfVersions(versions);
        if (versions.length > 0) {
          setScfVersionId(versions[0].scf_version_id);
        }
      } catch (err) {
        console.error("Failed to load SCF versions:", err);
        // Fallback: attempt with known UUID
        setScfVersions([{ scf_version_id: "50000000-0000-4000-8000-000000000001", version_label: "SCF 2026.1.1" }]);
        setScfVersionId("50000000-0000-4000-8000-000000000001");
      } finally {
        setLoadingVersions(false);
      }
    }
    fetchVersions();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Get org ID from Better Auth session
      const session = await authClient.getSession();
      const orgId = session?.data?.session?.activeOrganizationId;
      if (!orgId) {
        setError("No active organization. Please activate an organization first.");
        setLoading(false);
        return;
      }

      const res = await api<{ assessment_id: string }>("/api/v1/assessments", {
        method: "POST",
        body: JSON.stringify({
          name,
          scf_version_id: scfVersionId,
          organization_id: orgId,
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
              disabled={loadingVersions}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            >
              {loadingVersions ? (
                <option value="">Loading versions...</option>
              ) : scfVersions.length === 0 ? (
                <option value="">No versions available</option>
              ) : (
                scfVersions.map(v => (
                  <option key={v.scf_version_id} value={v.scf_version_id}>{v.version_label}</option>
                ))
              )}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingVersions || !scfVersionId}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
