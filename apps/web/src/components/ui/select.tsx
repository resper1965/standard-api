import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedValueLabel?: React.ReactNode
  setSelectedValueLabel: (label: React.ReactNode) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

export function Select({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValueLabel, setSelectedValueLabel] = React.useState<React.ReactNode>(null)
  
  // Close dropdown on click outside
  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        isOpen,
        setIsOpen,
        selectedValueLabel,
        setSelectedValueLabel,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within a Select")

  return (
    <button
      type="button"
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {context.selectedValueLabel || children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

export function SelectValue({
  placeholder,
}: {
  placeholder?: string
}) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within a Select")

  return (
    <span className="block truncate text-left">
      {context.value ? context.selectedValueLabel : <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  )
}

export function SelectContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within a Select")

  if (!context.isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 mt-1 max-h-60 overflow-y-auto",
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export function SelectItem({
  className,
  children,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be used within a Select")

  const isSelected = context.value === value

  // Update visual label if selected
  React.useEffect(() => {
    if (isSelected) {
      context.setSelectedValueLabel(children)
    }
  }, [isSelected, children])

  const handleSelect = () => {
    if (context.onValueChange) {
      context.onValueChange(value)
    }
    context.setSelectedValueLabel(children)
    context.setIsOpen(false)
  }

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent/15 text-primary font-medium",
        className
      )}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      <span className="block truncate text-left">{children}</span>
    </div>
  )
}
