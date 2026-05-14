import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string          // kept for backward compat, but NOT rendered (title lives in topbar)
  description?: string
  children?: ReactNode   // action buttons on the right
}

/**
 * Page action bar — renders description + action buttons.
 * The page title is handled by the global PageTopBar component
 * and should NOT be duplicated here.
 */
export function PageHeader({ description, children }: PageHeaderProps) {
  if (!description && !children) return null;

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0">
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
