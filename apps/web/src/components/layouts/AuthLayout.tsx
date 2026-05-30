import { Outlet } from "react-router-dom"

/**
 * AuthLayout — passthrough wrapper for auth pages.
 * The LoginPage component handles its own full-screen layout,
 * background effects, and responsive design internally.
 */
export function AuthLayout() {
  return <Outlet />
}
