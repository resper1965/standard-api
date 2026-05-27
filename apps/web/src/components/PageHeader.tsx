import { type ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Beautiful page header rendered inline at the top of page components.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-brand font-bold text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-base">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  )
}
