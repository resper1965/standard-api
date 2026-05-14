import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { PageTopBar } from "./PageTopBar";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assessments": "Assessments",
  "/documents": "Documents",
  "/gap-analysis": "Gap Analysis",
  "/reports": "Reports",
  "/settings": "Settings",
  "/scf": "SCF Catalog",
  "/admin/tenants": "Organizations",
  "/admin/users": "Users",
  "/admin/license-keys": "License Keys",
  "/admin/audit": "Audit Logs",
  "/admin/system": "System Health",
};

export function AppLayout() {
  const location = useLocation();
  
  // Match exact or prefix (e.g. /assessments/123 → "Assessments")
  const title = routeTitles[location.pathname] 
    ?? Object.entries(routeTitles).find(([path]) => location.pathname.startsWith(path + "/"))?.[1]
    ?? "";

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <PageTopBar title={title} />
        <main className="main-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
