import { useEffect, useState } from "react";
import { api } from "../lib/api";

type ScfVersion = {
  scf_version_id: string;
  version_label: string;
  release_date?: string;
  is_synthetic: boolean;
};

type ScfDomain = {
  id: string;
  domain_code: string;
  domain_name: string;
  description?: string;
  sort_order: number;
};

type ScfControl = {
  control_id: string;
  control_code: string;
  control_title: string;
  control_description?: string;
  status: string;
};

type ScfFramework = {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  publisher?: string;
  status: string;
};

export function ScfCatalogPage() {
  const [version, setVersion] = useState<ScfVersion | null>(null);
  const [domains, setDomains] = useState<ScfDomain[]>([]);
  const [controls, setControls] = useState<ScfControl[]>([]);
  const [frameworks, setFrameworks] = useState<ScfFramework[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"controls" | "frameworks">("controls");

  useEffect(() => {
    const load = async () => {
      try {
        const v = await api<ScfVersion>("/api/v1/scf/versions/latest");
        setVersion(v);
        const [d, c, f] = await Promise.all([
          api<{ data: ScfDomain[] }>(`/api/v1/scf/versions/${v.scf_version_id}/domains`),
          api<{ data: ScfControl[] }>(`/api/v1/scf/versions/${v.scf_version_id}/controls`),
          api<{ data: ScfFramework[] }>("/api/v1/scf/frameworks"),
        ]);
        setDomains(d.data);
        setControls(c.data);
        setFrameworks(f.data);
      } catch {
        // SCF not loaded — show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = controls.filter((c) => {
    const matchesDomain = !activeDomain || c.control_code.startsWith(activeDomain);
    const matchesSearch =
      !search ||
      c.control_code.toLowerCase().includes(search.toLowerCase()) ||
      c.control_title.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  if (loading)
    return (
      <div className="page-header">
        <p style={{ color: "var(--text-muted)" }}>Loading SCF catalog…</p>
      </div>
    );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">SCF Catalog</h1>
        <p className="page-subtitle">
          {version
            ? `Version ${version.version_label}${version.is_synthetic ? " (Synthetic)" : ""}`
            : "No SCF version loaded"}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        <button
          className={`btn ${tab === "controls" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("controls")}
        >
          Controls ({controls.length})
        </button>
        <button
          className={`btn ${tab === "frameworks" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("frameworks")}
        >
          Frameworks ({frameworks.length})
        </button>
      </div>

      {tab === "controls" && (
        <>
          {/* Search + domain filter */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              marginBottom: "var(--space-6)",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Search controls…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <select
              value={activeDomain ?? ""}
              onChange={(e) => setActiveDomain(e.target.value || null)}
            >
              <option value="">All Domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain_code}>
                  {d.domain_code} — {d.domain_name}
                </option>
              ))}
            </select>
          </div>

          {/* Controls table */}
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No controls found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.control_id}>
                      <td style={{ fontWeight: "var(--weight-semibold)", color: "var(--accent)" }}>
                        {c.control_code}
                      </td>
                      <td>{c.control_title}</td>
                      <td>
                        <span className="badge badge-success">{c.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "frameworks" && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Publisher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No frameworks loaded.
                  </td>
                </tr>
              ) : (
                frameworks.map((f) => (
                  <tr key={f.framework_id || (f as any).id}>
                    <td style={{ fontWeight: "var(--weight-semibold)", color: "var(--admin)" }}>
                      {f.framework_code || (f as any).framework_id}
                    </td>
                    <td>{f.framework_name || (f as any).name}</td>
                    <td style={{ color: "var(--text-muted)" }}>{f.publisher ?? "—"}</td>
                    <td>
                      <span className="badge badge-success">{f.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
