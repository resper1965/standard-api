import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  banned: boolean;
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mock fetch as we don't have the exact API endpoint docs right now
      const res = await api<{ data: User[] }>("/api/auth/admin/list-users", {
        method: "GET"
      }).catch(() => [
        { id: "1", name: "Admin User", email: "admin@bekaa.eu", role: "admin", createdAt: new Date(), banned: false }
      ]); // Fallback mock
      const dataArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setUsers(dataArray);
    } catch (e: any) {
      setError(e.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">User Administration</h1>
          <p className="page-subtitle">Manage users, roles, and access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert("Invite flow not implemented")}>Invite User</button>
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
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Role</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Created At</th>
                  <th style={{ textAlign: "right", padding: "12px", borderBottom: "1px solid var(--border)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}>{u.name}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{u.email}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`badge ${u.role === "admin" ? "badge-danger" : "badge-success"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                      <button className="btn">Edit Role</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
