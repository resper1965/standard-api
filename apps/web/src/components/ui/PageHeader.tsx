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
  return (
    <div className="ds-page-header">
      <div className="ds-page-header-left">
        <h1 className="ds-page-title">
          {title}
          {badge && <span className="ds-page-badge">{badge}</span>}
        </h1>
        {description && (
          <p className="ds-page-desc">{description}</p>
        )}
      </div>
      {actions && (
        <div className="ds-page-actions">{actions}</div>
      )}
    </div>
  )
}
