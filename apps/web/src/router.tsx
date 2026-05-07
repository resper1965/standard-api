import { createBrowserRouter, redirect } from "react-router-dom"
import { AuthLayout } from "./components/layouts/AuthLayout"
import { DashboardLayout } from "./components/layouts/DashboardLayout"
import { LoginPage } from "./pages/auth/LoginPage"
import { OverviewPage } from "./pages/dashboard/OverviewPage"
import { PlaygroundPage } from "./pages/dashboard/PlaygroundPage"
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

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AuthLayout />,
        loader: requireNoAuth,
        children: [
            { path: "/", loader: () => redirect("/login") },
            { path: "login", element: <LoginPage /> }
        ]
    },
    {
        path: "/dashboard",
        element: <DashboardLayout />,
        loader: requireAuth,
        children: [
            { index: true, element: <OverviewPage /> },
            { path: "playground", element: <PlaygroundPage /> },
            { path: "settings", element: <div>Settings Placeholder</div> }
        ]
    }
])
