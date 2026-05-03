import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import type { FormEvent } from "react";

export function SettingsPage() {
  const { data: session } = authClient.useSession();
  
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
    // Fetch active sessions
    authClient.listSessions().then(res => {
      if (res.data) setSessions(res.data);
    });
  }, [session]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await authClient.changePassword({ newPassword, currentPassword });
      if (error) throw new Error(error.message);
      setMessage({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (token: string) => {
    if (!window.confirm("Are you sure you want to revoke this session?")) return;
    try {
      await authClient.revokeSession({ token });
      setSessions(sessions.filter(s => s.token !== token));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "32px" }}>Settings</h1>

      {message && (
        <div style={{ 
          padding: "16px", 
          marginBottom: "24px", 
          borderRadius: "8px",
          backgroundColor: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: message.type === "success" ? "#22c55e" : "#ef4444",
          border: `1px solid ${message.type === "success" ? "#22c55e" : "#ef4444"}`
        }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Profile</h2>
        <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="input"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>Email</label>
            <input 
              type="email" 
              value={session?.user?.email || ""} 
              disabled
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", cursor: "not-allowed" }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
            Update Profile
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Security</h2>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>Current Password</label>
            <input 
              type="password" 
              required
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>New Password</label>
            <input 
              type="password" 
              required
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "white" }}
            />
          </div>
          <button type="submit" className="btn" disabled={loading} style={{ alignSelf: "flex-start" }}>
            Change Password
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Active Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Loading sessions...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sessions.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px" }}>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>{s.userAgent || "Unknown Device"}</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {new Date(s.createdAt).toLocaleString()} {session?.session?.id === s.id && <span style={{ color: "var(--accent)" }}>(Current)</span>}
                  </p>
                </div>
                {session?.session?.id !== s.id && (
                  <button className="btn btn-danger" onClick={() => handleRevokeSession(s.token)}>Revoke</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
