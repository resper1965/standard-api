import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";

import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";

import { AssessmentsPage } from "./pages/Assessments";
import { AssessmentDetail } from "./pages/AssessmentDetail";
import { DocumentsPage } from "./pages/Documents";
import { GapAnalysisPage } from "./pages/GapAnalysis";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";

import { AdminOrganizations } from "./pages/admin/Organizations";
import { AdminUsers } from "./pages/admin/Users";
import { AdminLicenses } from "./pages/admin/Licenses";
import { AdminAuditLogs } from "./pages/admin/AuditLogs";
import { AdminSystemHealth } from "./pages/admin/SystemHealth";

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
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/gap-analysis" element={<GapAnalysisPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/tenants" element={<AdminOrganizations />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/license-keys" element={<AdminLicenses />} />
              <Route path="/admin/audit" element={<AdminAuditLogs />} />
              <Route path="/admin/system" element={<AdminSystemHealth />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
