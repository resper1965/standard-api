import { createBrowserRouter, redirect } from "react-router-dom"
import { AuthLayout } from "./components/layouts/AuthLayout"
import { DashboardLayout } from "./components/layouts/DashboardLayout"
import { LoginPage } from "./pages/auth/LoginPage"
import { OverviewPage } from "./pages/dashboard/OverviewPage"
import { SettingsPage } from "./pages/dashboard/settings/SettingsPage"
import { authClient } from "./lib/auth-client"

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

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AuthLayout />,
        loader: requireNoAuth,
        HydrateFallback: LoadingFallback,
        children: [
            { path: "/", loader: () => redirect("/login") },
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
            { path: "playground", loader: () => redirect("/dashboard/settings") },
            { path: "settings", element: <SettingsPage /> }
        ]
    },
    {
        path: "*",
        loader: () => redirect("/dashboard")
    }
])
