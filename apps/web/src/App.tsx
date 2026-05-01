import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { PlaceholderPage } from "./pages/Placeholder";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected: any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/assessments"
              element={
                <PlaceholderPage
                  title="Assessments"
                  icon="📋"
                  description="Manage your security assessments"
                />
              }
            />
            <Route
              path="/documents"
              element={
                <PlaceholderPage
                  title="Documents"
                  icon="📄"
                  description="Upload and manage evidence documents"
                />
              }
            />
            <Route
              path="/gap-analysis"
              element={
                <PlaceholderPage
                  title="Gap Analysis"
                  icon="🔍"
                  description="View gaps by control and framework"
                />
              }
            />
            <Route
              path="/reports"
              element={
                <PlaceholderPage
                  title="Reports"
                  icon="📈"
                  description="Generate and download assessment reports"
                />
              }
            />
            <Route
              path="/settings"
              element={
                <PlaceholderPage
                  title="Settings"
                  icon="⚙️"
                  description="Manage your profile and preferences"
                />
              }
            />

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route
                path="/admin/tenants"
                element={
                  <PlaceholderPage
                    title="Organizations"
                    icon="🏢"
                    description="Manage tenant organizations"
                  />
                }
              />
              <Route
                path="/admin/users"
                element={
                  <PlaceholderPage
                    title="User Administration"
                    icon="👥"
                    description="Manage users, roles, and access"
                  />
                }
              />
              <Route
                path="/admin/license-keys"
                element={
                  <PlaceholderPage
                    title="License Keys"
                    icon="🔑"
                    description="Generate and manage API license keys"
                  />
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <PlaceholderPage
                    title="Audit Logs"
                    icon="📜"
                    description="View system audit trail"
                  />
                }
              />
              <Route
                path="/admin/system"
                element={
                  <PlaceholderPage
                    title="System Health"
                    icon="🩺"
                    description="Monitor workers, queues, and database"
                  />
                }
              />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
