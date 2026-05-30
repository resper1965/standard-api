/* eslint-disable react-refresh/only-export-components */
import { redirect, Navigate } from "react-router-dom"
import { AuthLayout } from "./components/layouts/AuthLayout"
import { DashboardLayout } from "./components/layouts/DashboardLayout"
import { LoginPage } from "./pages/auth/LoginPage"
import { OverviewPage } from "./pages/dashboard/OverviewPage"
import { SettingsPage } from "./pages/dashboard/settings/SettingsPage"
import { authClient } from "./lib/auth-client"
import { lazy, Suspense } from "react"
import { ErrorPage } from "./components/ErrorPage"

// Lazy-load heavy pages
const SdkPage = lazy(() => import("./pages/dashboard/sdk/SdkPage").then(m => ({ default: m.SdkPage })))
const ApiKeysPage = lazy(() => import("./pages/dashboard/api-keys/ApiKeysPage").then(m => ({ default: m.ApiKeysPage })))

// Admin pages
const AdminOrganizations = lazy(() => import("./pages/admin/Organizations").then(m => ({ default: m.AdminOrganizations })))
const AdminUsers = lazy(() => import("./pages/admin/Users").then(m => ({ default: m.AdminUsers })))
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs").then(m => ({ default: m.AdminAuditLogs })))
const AdminSystemHealth = lazy(() => import("./pages/admin/SystemHealth").then(m => ({ default: m.AdminSystemHealth })))


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

export const routes = [
    {
        path: "/",
        errorElement: <ErrorPage />,
        children: [
            {
                element: <AuthLayout />,
                loader: requireNoAuth,
                children: [
                    { index: true, element: <Navigate to="/login" replace /> },
                    { path: "login", element: <LoginPage /> }
                ]
            },
            {
                path: "dashboard",
                element: <DashboardLayout />,
                loader: requireAuth,
                children: [
                    { index: true, element: <OverviewPage /> },
                    { path: "api-keys", element: <SuspenseWrap><ApiKeysPage /></SuspenseWrap> },
                    { path: "sdk", element: <SuspenseWrap><SdkPage /></SuspenseWrap> },

                    { path: "settings", element: <SettingsPage /> },
                    // Admin
                    { path: "organizations", element: <SuspenseWrap><AdminOrganizations /></SuspenseWrap> },
                    { path: "users", element: <SuspenseWrap><AdminUsers /></SuspenseWrap> },
                    { path: "audit-logs", element: <SuspenseWrap><AdminAuditLogs /></SuspenseWrap> },
                    { path: "system-health", element: <SuspenseWrap><AdminSystemHealth /></SuspenseWrap> },
                ]
            },
            {
                path: "*",
                loader: () => redirect("/dashboard")
            }
        ]
    }
]
