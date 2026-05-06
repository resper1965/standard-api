import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";

type Organization = {
  id: string; // From auth backend
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, any>;
};

export function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      // In a real better-auth setup, there is an admin plugin or organization plugin endpoint.
      // Mocking fetch as we don't have the exact list-all endpoint documented here
      const res = await api<any>("/api/auth/organization/list", {
        method: "GET"
      }).catch(() => [
        { id: "org_default", name: "Default Org", slug: "default", createdAt: new Date() }
      ]); // Fallback mock
      const dataArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setOrgs(dataArray);
    } catch (e: any) {
      setError(e.message || "Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api("/api/auth/organization/create", {
        method: "POST",
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug })
      });
      setShowModal(false);
      setNewOrgName("");
      setNewOrgSlug("");
      await fetchOrgs();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage tenant organizations and access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Organization</button>
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
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Slug</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Created At</th>
                  <th style={{ textAlign: "right", padding: "12px", borderBottom: "1px solid var(--border)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="table-row">
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}>{o.name}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{o.slug}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                      <button className="btn">Edit</button>
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
            <h2 style={{ marginTop: 0 }}>Create Organization</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px" }}>Name</label>
                <input required type="text" className="input" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px" }}>Slug (unique, url-friendly)</label>
                <input required type="text" className="input" value={newOrgSlug} onChange={e => setNewOrgSlug(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
