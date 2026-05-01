import { NavLink } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";
import "./Sidebar.css";

const userLinks = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/assessments", icon: "📋", label: "Assessments" },
  { to: "/documents", icon: "📄", label: "Documents" },
  { to: "/gap-analysis", icon: "🔍", label: "Gap Analysis" },
  { to: "/reports", icon: "📈", label: "Reports" },
];

const adminLinks = [
  { to: "/admin/tenants", icon: "🏢", label: "Organizations" },
  { to: "/admin/users", icon: "👥", label: "Users" },
  { to: "/admin/license-keys", icon: "🔑", label: "License Keys" },
  { to: "/admin/audit", icon: "📜", label: "Audit Logs" },
  { to: "/admin/system", icon: "🩺", label: "System Health" },
];

export function Sidebar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-shield">🛡️</span>
        <h1>Aegis</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <span className="sidebar-section-title">Platform</span>
          {userLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <div className="sidebar-section">
            <span className="sidebar-section-title">Administration</span>
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `sidebar-link admin-link${isActive ? " active" : ""}`
                }
              >
                <span className="sidebar-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="topbar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{session?.user?.name}</span>
            <span className="sidebar-user-role">
              {isAdmin ? "Super Admin" : "User"}
            </span>
          </div>
        </div>
        <button
          className="btn btn-ghost sidebar-logout"
          onClick={() => signOut()}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
