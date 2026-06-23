/**
 * PageHeader — b.standard Dashboard Page Header
 * Nordic Tech Design System · Enterprise Grade
 */
import React from "react"

interface PageHeaderProps {
  title: string
  description?: string
  badge?: string
  actions?: React.ReactNode
}

export function PageHeader({ badge, actions }: PageHeaderProps) {
  if (!badge && !actions) return null;

  return (
    <div className="ds-page-header pb-2">
      <div className="ds-page-header-left">
        <div className="flex flex-wrap items-center gap-3">
          {badge && <span className="ds-page-badge">{badge}</span>}
        </div>
      </div>
      {actions && (
        <div className="ds-page-actions">{actions}</div>
      )}
    </div>
  )
}
