import { useState, useCallback, useEffect, useMemo } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { useSession, signOut } from "@/lib/auth-client"
import {
  LayoutDashboard, Settings, LogOut, Loader2, FileText, Search,
  BarChart3, Shield, Puzzle, ClipboardList, Menu, X,
  Building2, Key, Users, ScrollText, HeartPulse, ChevronRight,
  Bell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeaderProvider, usePageHeader } from "./PageHeaderContext"

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
]

const adminItems: NavItem[] = [
  { name: "Organizations", path: "/dashboard/organizations", icon: Building2 },
  { name: "API Keys", path: "/dashboard/licenses", icon: Key },
  { name: "Users", path: "/dashboard/users", icon: Users },
  { name: "Audit Logs", path: "/dashboard/audit-logs", icon: ScrollText },
  { name: "System Health", path: "/dashboard/system-health", icon: HeartPulse },
]

/** Maps route paths to page titles for the sticky topbar */
const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/assessments": "Assessments",
  "/dashboard/documents": "Documents",
  "/dashboard/gap-analysis": "Gap Analysis",
  "/dashboard/reports": "Reports",
  "/dashboard/scf-catalog": "SCF Catalog",
  "/dashboard/agent-runs": "Agent Runs",
  "/dashboard/sdk": "SDK & Docs",
  "/dashboard/settings": "Settings",
  "/dashboard/organizations": "Organizations",
  "/dashboard/licenses": "API Keys",
  "/dashboard/users": "Users",
  "/dashboard/audit-logs": "Audit Logs",
  "/dashboard/system-health": "System Health",
}

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
              className={`nav-magnetic group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "nav-active-pill bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="nav-icon h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span className="truncate">{item.name}</span>
              {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
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

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [mobileOpen])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Resolve current page title from route map
  const pageTitle = useMemo(() => {
    const path = location.pathname
    return routeTitles[path]
      ?? Object.entries(routeTitles).find(([p]) => path.startsWith(p + "/"))?.[1]
      ?? ""
  }, [location.pathname])

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) return null

  const userInitial = session.user.name?.charAt(0).toUpperCase() || "?"
  const userRole = (session.user as any).role || "member"

  const sidebarContent = (
    <>
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Platform
        </p>
        <NavLinks items={navItems} currentPath={location.pathname} onNavigate={closeMobile} />
        
        <div className="my-4 mx-3 border-t border-border/50" />

        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Administration
        </p>
        <NavLinks items={adminItems} currentPath={location.pathname} onNavigate={closeMobile} />
      </nav>

      {/* User footer */}
      <div className="border-t border-border/50 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/40">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{session.user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{session.user.email}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">
            {userRole}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-muted-foreground hover:text-foreground text-xs"
            asChild
          >
            <Link to="/dashboard/settings">
              <Settings className="mr-2 h-3.5 w-3.5" />
              Settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive text-xs"
            onClick={() => signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <PageHeaderProvider>
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside className="w-[260px] flex-col border-r border-border/60 bg-card hidden md:flex h-screen sticky top-0">
        <div className="flex h-14 items-center px-6 border-b border-border/50 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-[1.46rem] font-brand">
              standard<span className="brand-dot text-primary">.</span>
            </span>
          </Link>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Mobile Backdrop + Drawer ──────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-card border-r border-border/60 shadow-xl transform transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-5 border-b border-border/50">
          <span className="text-[1.46rem] font-brand">
            standard<span className="brand-dot text-primary">.</span>
          </span>
          <Button variant="ghost" size="icon" onClick={closeMobile} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card px-4 md:hidden sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-[1.3rem] font-brand">
            standard<span className="brand-dot text-primary">.</span>
          </span>
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-[10px] font-bold">
            {userInitial}
          </div>
        </header>

        {/* Desktop sticky topbar with page title + description + actions */}
        <DesktopTopbar pageTitle={pageTitle} userInitial={userInitial} />

        <div className="flex-1 px-6 md:px-8 py-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
    </PageHeaderProvider>
  )
}

/** Sticky desktop topbar — receives page-level description + actions via context */
function DesktopTopbar({ pageTitle, userInitial }: { pageTitle: string; userInitial: string }) {
  const { state } = usePageHeader()
  const hasExtra = !!(state.description || state.actions)

  return (
    <header className={`hidden md:block border-b border-border/50 bg-card/80 backdrop-blur-sm px-8 sticky top-0 z-30 transition-all duration-200 ${
      hasExtra ? 'py-3' : ''
    }`}>
      <div className={`flex items-center justify-between ${hasExtra ? '' : 'h-12'}`}>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h1>
          {state.description && (
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
              {state.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {state.actions}
          <button className="bell-spell relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          </button>
          <div className="avatar-glow h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform">
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  )
}
