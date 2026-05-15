import { createBrowserRouter, redirect, Navigate } from "react-router-dom"
import { AuthLayout } from "./components/layouts/AuthLayout"
import { DashboardLayout } from "./components/layouts/DashboardLayout"
import { LoginPage } from "./pages/auth/LoginPage"
import { OverviewPage } from "./pages/dashboard/OverviewPage"
import { SettingsPage } from "./pages/dashboard/settings/SettingsPage"
import { authClient } from "./lib/auth-client"
import { lazy, Suspense } from "react"

// Lazy-load heavy pages
const Assessments = lazy(() => import("./pages/Assessments").then(m => ({ default: m.AssessmentsPage })))
const AssessmentDetail = lazy(() => import("./pages/AssessmentDetail").then(m => ({ default: m.AssessmentDetail })))
const Documents = lazy(() => import("./pages/Documents").then(m => ({ default: m.DocumentsPage })))
const GapAnalysis = lazy(() => import("./pages/GapAnalysis").then(m => ({ default: m.GapAnalysisPage })))
const Reports = lazy(() => import("./pages/Reports").then(m => ({ default: m.ReportsPage })))
const ScfCatalog = lazy(() => import("./pages/ScfCatalog").then(m => ({ default: m.ScfCatalogPage })))
const SdkPage = lazy(() => import("./pages/dashboard/sdk/SdkPage").then(m => ({ default: m.SdkPage })))
const AgentRuns = lazy(() => import("./pages/AgentRuns").then(m => ({ default: m.AgentRunsPage })))

// Admin pages
const AdminOrganizations = lazy(() => import("./pages/admin/Organizations").then(m => ({ default: m.AdminOrganizations })))
const AdminLicenses = lazy(() => import("./pages/admin/Licenses").then(m => ({ default: m.AdminLicenses })))
const AdminUsers = lazy(() => import("./pages/admin/Users").then(m => ({ default: m.AdminUsers })))
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs").then(m => ({ default: m.AdminAuditLogs })))
const AdminSystemHealth = lazy(() => import("./pages/admin/SystemHealth").then(m => ({ default: m.AdminSystemHealth })))

// Intelligence
const KnowledgeGraph = lazy(() => import("./pages/knowledge-graph/KnowledgeGraph").then(m => ({ default: m.KnowledgeGraphPage })))


// Simple Guard
const requireAuth = async () => {
    const session = await authClient.getSession()
    if (!session?.data?.user) {
        throw redirect("/login")
    }
    return null
}

const requireNoAuth = async () => {
    const session = await authClient.getSession()
    if (session?.data?.user) {
        throw redirect("/dashboard")
    }
    return null
}

const LoadingFallback = () => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569', fontFamily: 'Montserrat, sans-serif' }}>Carregando Standard Platform...</p>
    </div>
);

const PageLoader = () => (
    <div style={{ display: 'flex', padding: '3rem', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem' }}>Loading...</p>
    </div>
);

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AuthLayout />,
        loader: requireNoAuth,
        HydrateFallback: LoadingFallback,
        children: [
            { index: true, element: <Navigate to="/login" replace /> },
            { path: "login", element: <LoginPage /> }
        ]
    },
    {
        path: "/dashboard",
        element: <DashboardLayout />,
        loader: requireAuth,
        HydrateFallback: LoadingFallback,
        children: [
            { index: true, element: <OverviewPage /> },
            { path: "assessments", element: <SuspenseWrap><Assessments /></SuspenseWrap> },
            { path: "assessments/:assessmentId", element: <SuspenseWrap><AssessmentDetail /></SuspenseWrap> },
            { path: "documents", element: <SuspenseWrap><Documents /></SuspenseWrap> },
            { path: "gap-analysis", element: <SuspenseWrap><GapAnalysis /></SuspenseWrap> },
            { path: "reports", element: <SuspenseWrap><Reports /></SuspenseWrap> },
            { path: "scf-catalog", element: <SuspenseWrap><ScfCatalog /></SuspenseWrap> },
            { path: "agent-runs", element: <SuspenseWrap><AgentRuns /></SuspenseWrap> },
            { path: "sdk", element: <SuspenseWrap><SdkPage /></SuspenseWrap> },
            { path: "knowledge-graph", element: <SuspenseWrap><KnowledgeGraph /></SuspenseWrap> },
            { path: "settings", element: <SettingsPage /> },
            // Admin
            { path: "organizations", element: <SuspenseWrap><AdminOrganizations /></SuspenseWrap> },
            { path: "licenses", element: <SuspenseWrap><AdminLicenses /></SuspenseWrap> },
            { path: "users", element: <SuspenseWrap><AdminUsers /></SuspenseWrap> },
            { path: "audit-logs", element: <SuspenseWrap><AdminAuditLogs /></SuspenseWrap> },
            { path: "system-health", element: <SuspenseWrap><AdminSystemHealth /></SuspenseWrap> },
        ]
    },
    {
        path: "*",
        loader: () => redirect("/dashboard")
    }
])

