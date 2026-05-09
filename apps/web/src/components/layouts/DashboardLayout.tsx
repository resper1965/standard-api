import { useState, useCallback, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { useSession, signOut } from "@/lib/auth-client"
import {
  LayoutDashboard, Settings, LogOut, Loader2, FileText, Search,
  BarChart3, Shield, Puzzle, ClipboardList, Menu, X
} from "lucide-react"
import { Button } from "@/components/ui/button"

type NavItem = {
  name: string
  path: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const navItems: NavItem[] = [
  { name: "Overview", path: "/dashboard", icon: LayoutDashboard, end: true },
  { name: "Assessments", path: "/dashboard/assessments", icon: ClipboardList },
  { name: "Documents", path: "/dashboard/documents", icon: FileText },
  { name: "Gap Analysis", path: "/dashboard/gap-analysis", icon: Search },
  { name: "Reports", path: "/dashboard/reports", icon: BarChart3 },
  { name: "SCF Catalog", path: "/dashboard/scf-catalog", icon: Shield },
  { name: "SDK & Docs", path: "/dashboard/sdk", icon: Puzzle },
  { name: "Settings", path: "/dashboard/settings", icon: Settings },
]

function NavLinks({ items, currentPath, onNavigate }: {
  items: NavItem[]
  currentPath: string
  onNavigate?: () => void
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.end
          ? currentPath === item.path
          : currentPath.startsWith(item.path)
        return (
          <Link key={item.name} to={item.path} onClick={onNavigate}>
            <div
              className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </div>
          </Link>
        )
      })}
    </>
  )
}

export function DashboardLayout() {
  const { data: session, isPending } = useSession()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [mobileOpen])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) return null

  const userInitial = session.user.name?.charAt(0).toUpperCase() || "?"

  const sidebarContent = (
    <>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <NavLinks items={navItems} currentPath={location.pathname} onNavigate={closeMobile} />
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-4 flex items-center space-x-3 rounded-md p-2 bg-secondary/50">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen break-words w-full bg-background text-foreground">
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="w-64 flex-col border-r border-border bg-card shadow-sm hidden md:flex h-screen sticky top-0">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-xl font-brand font-medium">
            standard<span className="text-[#00ADE8]">.</span>
          </span>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Mobile Backdrop + Drawer ──────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card shadow-xl border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-xl font-brand font-medium">
            standard<span className="text-[#00ADE8]">.</span>
          </span>
          <Button variant="ghost" size="icon" onClick={closeMobile} className="h-8 w-8">
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-brand font-medium">
            standard<span className="text-[#00ADE8]">.</span>
          </span>
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">
            {userInitial}
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
