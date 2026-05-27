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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold font-brand tracking-tight mb-6">New Assessment</h2>
        {error && <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assessment Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Q3 Compliance Audit"
              className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">SCF Version</label>
            <select 
              value={scfVersionId} 
              onChange={e => setScfVersionId(e.target.value)}
              disabled={loadingVersions}
              className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all disabled:opacity-50"
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
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" disabled={loading || loadingVersions || !scfVersionId}>
              {loading ? "Creating..." : "Create Assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
