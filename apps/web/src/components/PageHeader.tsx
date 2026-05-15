import { useEffect, type ReactNode } from "react"
import { usePageHeader } from "./layouts/PageHeaderContext"

type PageHeaderProps = {
  title: string          // kept for backward compat (title lives in topbar via routeTitles)
  description?: string
  children?: ReactNode   // action buttons rendered in the sticky topbar
}

/**
 * Page header bridge — pushes description + action buttons to the
 * sticky topbar in DashboardLayout via context.
 * Renders nothing in the page body itself.
 */
export function PageHeader({ description, children }: PageHeaderProps) {
  const { setHeader, clear } = usePageHeader()

  useEffect(() => {
    setHeader({ description, actions: children })
    return () => clear()
  }, [description, children, setHeader, clear])

  // Nothing rendered inline — everything lives in the sticky header
  return null
}
