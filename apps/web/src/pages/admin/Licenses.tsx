import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FormEvent } from "react";

type LicenseKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  expiresAt?: Date;
  status: "active" | "revoked" | "expired";
};

export function AdminLicenses() {
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      // Mock fetch
      const res = await api<{ data: LicenseKey[] }>("/api/auth/admin/list-licenses", {
        method: "GET"
      }).catch(() => ({ data: [
        { id: "1", name: "Production API Key", keyPrefix: "aegis_prod_****", createdAt: new Date(), status: "active" as const }
      ]})); 
      setLicenses(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch licenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      // Mock generate
      await new Promise(r => setTimeout(r, 1000));
      setGeneratedKey("aegis_prod_8f99a3b2c1d4e5f6g7h8i9j0");
      await fetchLicenses();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">License Keys</h1>
          <p className="page-subtitle">Generate and manage API access keys</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setGeneratedKey(null); }}>Generate API Key</button>
      </div>

      <div className="card">
        {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Key Prefix</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Created At</th>
                  <th style={{ textAlign: "right", padding: "12px", borderBottom: "1px solid var(--border)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id} className="table-row">
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}>{l.name}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}><code>{l.keyPrefix}</code></td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`badge ${l.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{l.status}</span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                      <button className="btn btn-danger">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px" }}>
            <h2 style={{ marginTop: 0 }}>Generate API License Key</h2>
            {generatedKey ? (
              <div>
                <div style={{ padding: "16px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid #22c55e", borderRadius: "6px", marginBottom: "16px", color: "#22c55e" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>Key generated successfully!</p>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>Please copy this key now. You will not be able to see it again.</p>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                  <input readOnly value={generatedKey} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }} />
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedKey)}>Copy</button>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => setShowModal(false)}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>Key Name</label>
                  <input required type="text" className="input" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={generating}>
                    {generating ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
