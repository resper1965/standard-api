import { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  children?: ReactNode  // action buttons on the right
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}
