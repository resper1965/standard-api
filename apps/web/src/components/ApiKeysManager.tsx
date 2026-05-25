import { useState, type FormEvent } from "react";
import { useSession } from "../lib/auth-client";

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface ApiKeysManagerProps {
  apiKeys: ApiKey[];
  onKeysChanged: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function ApiKeysManager({ apiKeys, onKeysChanged, loading, setLoading }: ApiKeysManagerProps) {
  const { data: session } = useSession();
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orgId = (session?.session as any)?.activeOrganizationId;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgId || !newKeyName) return;
    setLoading(true);
    setNewlyGeneratedKey(null);
    setError(null);
    
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      });
      if (!res.ok) throw new Error("Failed to generate API Key");
      
      const json = await res.json();
      setNewlyGeneratedKey(json.data.key);
      setNewKeyName("");
      onKeysChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!orgId) return;
    if (!window.confirm("Are you sure you want to revoke this API key? This will instantly block any agents using it.")) return;
    
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/api-keys/${keyId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to revoke API Key");
      onKeysChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px 0" }}>API Keys & Integrations</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Manage Machine-to-Machine (M2M) API keys for autonomous agents and external systems. 
          Keep these keys secret as they grant extensive access to your compliance workflows.
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", marginBottom: "24px", borderRadius: "6px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid #ef4444" }}>
          {error}
        </div>
      )}

      {newlyGeneratedKey && (
        <div style={{ padding: "16px", marginBottom: "24px", borderRadius: "8px", border: "1px dashed var(--accent)", backgroundColor: "rgba(99, 102, 241, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>New API Key Generated</h3>
            <button onClick={() => setNewlyGeneratedKey(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
          <p style={{ margin: "0 0 12px 0", color: "#e2e8f0" }}>Please copy this key and store it securely. You won't be able to see it again!</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <code style={{ flex: 1, padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", color: "white", fontSize: "1rem", wordBreak: "break-all", border: "1px solid var(--border)" }}>
              {newlyGeneratedKey}
            </code>
            <button className="btn" onClick={() => navigator.clipboard.writeText(newlyGeneratedKey)}>Copy</button>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} style={{ display: "flex", gap: "16px", alignItems: "flex-end", marginBottom: "32px", background: "rgba(0,0,0,0.1)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: "bold" }}>Create New Secret Key</label>
          <input 
            type="text" 
            required
            placeholder="Name (e.g., Privacy Agent, External SIEM)"
            value={newKeyName} 
            onChange={e => setNewKeyName(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !newKeyName} style={{ height: "42px" }}>
          Generate Secret
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 8px", fontWeight: "600", width: "30%" }}>NAME</th>
              <th style={{ padding: "12px 8px", fontWeight: "600", width: "25%" }}>SECRET KEY</th>
              <th style={{ padding: "12px 8px", fontWeight: "600", width: "20%" }}>CREATED</th>
              <th style={{ padding: "12px 8px", fontWeight: "600", width: "20%" }}>LAST USED</th>
              <th style={{ padding: "12px 8px", fontWeight: "600", width: "5%" }}></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px 8px", textAlign: "center", color: "var(--text-muted)" }}>
                  No active API keys found. M2M agents currently have no access.
                </td>
              </tr>
            ) : (
              apiKeys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "16px 8px", fontWeight: "500" }}>{k.name}</td>
                  <td style={{ padding: "16px 8px" }}>
                    <code style={{ fontSize: "0.875rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px" }}>
                      {k.maskedKey}
                    </code>
                  </td>
                  <td style={{ padding: "16px 8px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 8px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ padding: "16px 8px", textAlign: "right" }}>
                    <button 
                      onClick={() => handleRevoke(k.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.875rem", fontWeight: "bold" }}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "32px", padding: "16px", borderRadius: "6px", background: "rgba(255,255,255,0.02)" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>Agentic Tool Discovery</h4>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Supply this endpoint to external agents. They can hit this to retrieve available Standard Tools formatted as standard OpenAI/LangChain Function call representations.
        </p>
        <code style={{ display: "block", fontSize: "0.875rem", color: "var(--accent)", wordBreak: "break-all" }}>
          GET https://standard-api.bekaa.eu/api/v1/agent-tools/scf-controls
        </code>
      </div>
    </div>
  );
}


