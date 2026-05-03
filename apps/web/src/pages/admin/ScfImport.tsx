import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";

type ImportRun = {
  id: string;
  scf_version_id?: string;
  source_type: string;
  source_filename?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  import_statistics?: Record<string, number>;
};

export function AdminScfImport() {
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvContent, setCsvContent] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchRuns = async () => {
    try {
      const res = await api<{ data: ImportRun[] }>("/api/v1/admin/scf/import-runs");
      setRuns(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim() || !versionLabel.trim()) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await api<{ import_run: ImportRun; warnings: string[] }>("/api/v1/admin/scf/import-runs", {
        method: "POST",
        body: JSON.stringify({
          source_type: "csv",
          content: csvContent,
          version_label: versionLabel,
          source_filename: "manual-upload.csv",
        }),
      });
      setResult({
        success: res.import_run?.status === "succeeded",
        message: `Import ${res.import_run?.status ?? "completed"}. ${res.warnings?.length ? res.warnings.join("; ") : ""}`,
      });
      setCsvContent("");
      setVersionLabel("");
      await fetchRuns();
    } catch (err: any) {
      setResult({ success: false, message: err.message ?? "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") setCsvContent(text);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">SCF Import</h1>
        <p className="page-subtitle">Import SCF catalog data from structured CSV sources</p>
      </div>

      {/* Import form */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ marginTop: 0 }}>New Import</h2>
        <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label style={{ display: "block", marginBottom: "var(--space-1)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              SCF Version Label
            </label>
            <input
              type="text"
              placeholder="e.g. 2026.1"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              required
              style={{ width: "100%", maxWidth: "300px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "var(--space-1)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              CSV File or Paste Content
            </label>
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                📁 Choose CSV File
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            </div>
            <textarea
              rows={8}
              placeholder="Paste CSV content here, or use the file picker above..."
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8125rem" }}
            />
          </div>

          {result && (
            <div
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${result.success ? "var(--success)" : "var(--danger)"}`,
                color: result.success ? "var(--success)" : "var(--danger)",
                background: result.success ? "rgba(48,209,88,0.08)" : "rgba(255,69,58,0.08)",
              }}
            >
              {result.message}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={importing || !csvContent.trim()}>
              {importing ? "Importing…" : "Run Import"}
            </button>
          </div>
        </form>
      </div>

      {/* Import history */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Import History</h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : runs.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No import runs found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Status</th>
                <th>Statistics</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.started_at).toLocaleString()}</td>
                  <td>
                    <code>{run.source_type}</code>
                    {run.source_filename && <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>{run.source_filename}</span>}
                  </td>
                  <td>
                    <span className={`badge ${run.status === "succeeded" ? "badge-success" : run.status === "failed" ? "badge-danger" : "badge-warning"}`}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {run.import_statistics
                      ? Object.entries(run.import_statistics)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
