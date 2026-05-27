import { NavLink } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";
import "./Sidebar.css";
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Search, 
  Bot, 
  BarChart3, 
  Lock, 
  Box, 
  Settings,
  Building2,
  Users,
  Key,
  ScrollText,
  Activity,
  LogOut
} from "lucide-react";

const userLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/assessments", icon: ClipboardList, label: "Assessments" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/gap-analysis", icon: Search, label: "Gap Analysis" },
  { to: "/agent-runs", icon: Bot, label: "Agent Runs" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/scf", icon: Lock, label: "SCF Catalog" },
  { to: "/sdk", icon: Box, label: "SDK & Docs" },
  { to: "/settings", icon: Settings, label: "Settings" },
];
const adminLinks = [
  { to: "/admin/tenants", icon: Building2, label: "Organizations" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/license-keys", icon: Key, label: "License Keys" },
  { to: "/admin/audit", icon: ScrollText, label: "Audit Logs" },
  { to: "/admin/system", icon: Activity, label: "System Health" },
];

export function Sidebar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "platform_admin" || session?.user?.role === "admin";
  const userRole = session?.user?.role ?? "user";
  
  const roleDisplay = {
    platform_admin: "Platform Admin",
    admin: "Platform Admin",
    tenant_admin: "Tenant Admin",
    organization_admin: "Org Admin",
    assessor: "Assessor",
    auditor_readonly: "Auditor",
    user: "User"
  }[userRole as string] || "User";

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo !pl-4 py-6">
        <h1 className="text-2xl font-brand tracking-tighter">
          <span className="brand-logo">standard<span className="brand-logo-dot">.</span></span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <span className="sidebar-section-title px-4 mb-2">Platform</span>
          {userLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={"end" in link ? (link as any).end : false}
              className={({ isActive }) =>
                `sidebar-link flex items-center px-4 py-2 my-0.5 rounded-lg transition-all mx-2 ${
                  isActive 
                    ? "active bg-primary/10 text-primary font-semibold" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon className={`h-4 w-4 mr-3 ${isActive ? "text-primary" : "opacity-70 group-hover:opacity-100"}`} />
                  <span className="text-sm">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <div className="sidebar-section mt-6">
            <span className="sidebar-section-title px-4 mb-2">Administration</span>
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `sidebar-link admin-link flex items-center px-4 py-2 my-0.5 rounded-lg transition-all mx-2 ${
                    isActive 
                      ? "active bg-primary/10 text-primary font-semibold" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon className={`h-4 w-4 mr-3 ${isActive ? "text-primary" : "opacity-70 group-hover:opacity-100"}`} />
                    <span className="text-sm">{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer p-4 border-t border-border/50">
        <div className="sidebar-user flex items-center p-2 rounded-xl bg-muted/30 mb-2">
          <div className="topbar-avatar h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-background ring-offset-2 ring-offset-primary/10">
            {initials}
          </div>
          <div className="sidebar-user-info ml-3 overflow-hidden">
            <span className="sidebar-user-name text-sm font-semibold truncate leading-none mb-1 block">
              {session?.user?.name}
            </span>
            <span className="sidebar-user-role text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {roleDisplay}
            </span>
          </div>
        </div>
        <button
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all"
          onClick={() => signOut()}
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
