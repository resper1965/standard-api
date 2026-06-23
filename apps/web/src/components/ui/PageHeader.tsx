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

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  if (!description && !badge && !actions) return null;

  return (
    <div className="ds-page-header pb-2">
      <div className="ds-page-header-left">
        <div className="flex flex-wrap items-center gap-3">
          {badge && <span className="ds-page-badge">{badge}</span>}
          {description && <p className="ds-page-desc m-0 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="ds-page-actions">{actions}</div>
      )}
    </div>
  )
}
