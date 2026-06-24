/**
 * DashboardLayout — root shell for all authenticated pages.
 *
 * Architecture decisions:
 * - `useActiveOrg()` is the single source of truth for session/org/platformAdmin.
 * - No inline `as any` casts — session shape typed via StandardSession/StandardUser interfaces.
 * - `api()` wrapper used for all HTTP calls (consistent headers, error handling).
 * - ErrorBoundary wraps Outlet so page errors don't crash the shell.
 * - `isPlatformAdmin` computed once, passed as prop — never re-derived.
 */
import { useState, useCallback, useEffect, useMemo } from "react"
import "@/styles/dashboard.css"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { useSession, signOut } from "@/lib/auth-client"
import {
  LayoutDashboard, Settings, LogOut, Loader2, Puzzle, Menu, X,
  Building2, Key, Users, ScrollText, HeartPulse, ChevronRight,
  Bell, Webhook, Library, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { usePendingUserCount } from "@/lib/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Org {
  id: string
  name: string
}

type NavItem = {
  name: string
  path: string
  icon: typeof LayoutDashboard
  end?: boolean
}

// ─── Navigation config ────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { name: "Overview",   path: "/dashboard",          icon: LayoutDashboard, end: true },
  { name: "Threat Analysis", path: "/dashboard/threat-analysis", icon: ShieldAlert },
  { name: "API Keys",   path: "/dashboard/api-keys", icon: Key },
  { name: "Webhooks",   path: "/dashboard/webhooks", icon: Webhook },
  { name: "SCF Explorer", path: "/dashboard/scf",    icon: Library },
  { name: "SDK & Docs", path: "/dashboard/sdk",      icon: Puzzle },
]

const adminItems: NavItem[] = [
  { name: "Organizations", path: "/dashboard/organizations", icon: Building2 },
  { name: "Users",         path: "/dashboard/users",         icon: Users },
  { name: "Audit Logs",    path: "/dashboard/audit-logs",    icon: ScrollText },
  { name: "System Health", path: "/dashboard/system-health", icon: HeartPulse },
]

/** Maps exact route paths to page titles for the sticky topbar */
const routeTitles: Record<string, string> = {
  "/dashboard":                  "Overview",
  "/dashboard/threat-analysis":  "Threat Analysis",
  "/dashboard/sdk":              "SDK & Docs",
  "/dashboard/settings":         "Settings",
  "/dashboard/organizations":    "Organizations",
  "/dashboard/api-keys":         "API Keys",
  "/dashboard/webhooks":         "Webhooks",
  "/dashboard/scf":              "SCF Explorer",
  "/dashboard/users":            "Users",
  "/dashboard/audit-logs":       "Audit Logs",
  "/dashboard/system-health":    "System Health",
}

// ─── NavLinks ─────────────────────────────────────────────────────────────────

function NavLinks({ items, currentPath, onNavigate, badges }: {
  items: NavItem[]
  currentPath: string
  onNavigate?: () => void
  badges?: Record<string, number>
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.end
          ? currentPath === item.path
          : currentPath.startsWith(item.path)
        const badgeCount = badges?.[item.path]
        return (
          <Link key={item.name} to={item.path} onClick={onNavigate}>
            <div
              className={`nav-magnetic group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "nav-active-pill bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="nav-icon h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span className="truncate">{item.name}</span>
              {badgeCount != null && badgeCount > 0 && (
                <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
              {isActive && !badgeCount && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
            </div>
          </Link>
        )
      })}
    </>
  )
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────

export function DashboardLayout() {
  const { data: session, isPending } = useSession()
  const { isPlatformAdmin, orgId: activeOrgId } = useActiveOrg()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [orgsLoading, setOrgsLoading] = useState(false)

  // Pending approval count for admin badge
  const { data: pendingData } = usePendingUserCount()
  const pendingCount = pendingData?.data?.count ?? 0
  const adminBadges = pendingCount > 0 ? { "/dashboard/users": pendingCount } : undefined

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Close mobile nav on Escape
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [mobileOpen])

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  /**
   * Auto-activate the first organization if none is active.
   * Platform admins are always auto-scoped server-side — skipped.
   */
  useEffect(() => {
    async function autoActivateOrg() {
      if (isPending || isPlatformAdmin || activeOrgId) return
      try {
        const res = await api<{ data: Org[] }>("/api/v1/users/me/organizations")
        const list = Array.isArray(res?.data) ? res.data : []
        if (list.length > 0) {
          const activateRes = await api<{ session_rotated?: boolean }>(
            `/api/v1/users/me/organizations/${list[0].id}/activate`,
            { method: "POST" }
          )
          // H4 fix: server rotates session on org switch (deletes old session).
          // Must sign out to clear the stale cookie, then redirect to login.
          if (activateRes?.session_rotated) {
            await signOut()
            window.location.href = "/login"
          } else {
            window.location.reload()
          }
        } else if (location.pathname !== "/onboarding") {
          navigate("/onboarding")
        }
      } catch {
        // Silently ignore — user can activate org manually in Settings
      }
    }
    autoActivateOrg()
  }, [isPending, isPlatformAdmin, activeOrgId, location.pathname, navigate])

  /**
   * Load org list for the org switcher in the topbar.
   * Platform admins are always scoped to Bekaa — no switcher needed.
   */
  useEffect(() => {
    if (!session || isPlatformAdmin || activeOrgId) return
    let mounted = true
    setOrgsLoading(true)
    api<{ data: Org[] }>("/api/v1/users/me/organizations")
      .then(res => {
        if (!mounted) return
        const list = Array.isArray(res?.data) ? res.data : []
        setOrgs(list)
        if (list.length === 0 && location.pathname !== "/onboarding") {
          navigate("/onboarding")
        }
      })
      .catch(() => { /* silent — org switcher degrades gracefully */ })
      .finally(() => { if (mounted) setOrgsLoading(false) })
    return () => { mounted = false }
  }, [session, isPlatformAdmin, activeOrgId, location.pathname, navigate])

  // Also load orgs for the switcher when we already have an active org
  useEffect(() => {
    if (!session || isPlatformAdmin || orgs.length > 0) return
    let mounted = true
    api<{ data: Org[] }>("/api/v1/users/me/organizations")
      .then(res => {
        if (mounted) setOrgs(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => { /* silent */ })
    return () => { mounted = false }
  }, [session, isPlatformAdmin, orgs.length])

  const handleOrgChange = async (orgId: string) => {
    try {
      const res = await api<{ session_rotated?: boolean }>(
        `/api/v1/users/me/organizations/${orgId}/activate`,
        { method: "POST" }
      )
      // H4 fix: session was rotated — must sign out and re-login to get new cookie
      if (res?.session_rotated) {
        await signOut()
        window.location.href = "/login"
      } else {
        window.location.reload()
      }
    } catch {
      // Failed silently — reload would still be safe but skip to avoid confusion
    }
  }

  // Resolve current page title
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

  const getRoleDisplayName = (role?: string) => {
    if (!role) return "Organization Admin"
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const userInitial = session.user.name?.charAt(0).toUpperCase() ?? "?"
  const userRole = isPlatformAdmin ? "Platform Admin" : getRoleDisplayName(session.user.role)

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
        <NavLinks items={adminItems} currentPath={location.pathname} onNavigate={closeMobile} badges={adminBadges} />
      </nav>

      {/* User footer */}
      <div className="border-t border-border/50 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/40">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(143,168,155,0.15)", border: "1px solid rgba(143,168,155,0.3)", color: "#8fa89b" }}>
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
            className="flex-1 justify-start text-muted-foreground hover:text-foreground text-xs cursor-pointer"
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
            className="flex-1 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs cursor-pointer"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            aria-label="Sign out"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside className="w-[260px] flex-col border-r border-border/60 bg-card hidden md:flex h-screen sticky top-0">
        <div className="flex h-[68px] items-center px-6 border-b border-border/50 shrink-0">
          <Link to="/dashboard" className="flex flex-col" style={{ gap: "2px" }}>
            {/* Logo — b.standard */}
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "1.75rem",
              letterSpacing: "-0.05em",
              color: "#e9ecef",
              lineHeight: 1,
            }}>
              b<span style={{ color: "#8fa89b" }}>.</span>standard
            </span>
            {/* Slogan — be secure. */}
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "0.6875rem",
              letterSpacing: "0.07em",
              color: "#6c757d",
              textTransform: "lowercase",
              lineHeight: 1,
            }}>
              be secure<span style={{ color: "#8fa89b" }}>.</span>
            </span>
          </Link>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Mobile Backdrop ────────────────────────────── */}
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
        <div className="flex h-[68px] items-center justify-between px-5 border-b border-border/50">
          <div className="flex flex-col" style={{ gap: "2px" }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "1.6rem",
              letterSpacing: "-0.05em",
              color: "#e9ecef",
              lineHeight: 1,
            }}>
              b<span style={{ color: "#8fa89b" }}>.</span>standard
            </span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "0.6875rem",
              letterSpacing: "0.07em",
              color: "#6c757d",
              textTransform: "lowercase",
              lineHeight: 1,
            }}>
              be secure<span style={{ color: "#8fa89b" }}>.</span>
            </span>
          </div>
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
        <header className="flex h-[68px] items-center justify-between border-b border-border/50 bg-card px-4 md:hidden sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-[1.1rem] font-brand font-semibold tracking-tight truncate px-2 text-foreground">
            {pageTitle || <span className="brand-logo">standard<span className="brand-logo-dot">.</span></span>}
          </span>
          <div className="w-9 h-9 shrink-0" />
        </header>

        {/* Desktop sticky topbar */}
        <DesktopTopbar
          userInitial={userInitial}
          title={pageTitle}
          activeOrgId={activeOrgId}
          orgs={orgs}
          orgsLoading={orgsLoading}
          onOrgChange={handleOrgChange}
          isPlatformAdmin={isPlatformAdmin}
        />

        <div className="flex-1 px-6 md:px-8 py-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ─── DesktopTopbar ────────────────────────────────────────────────────────────

function DesktopTopbar({
  userInitial,
  title,
  activeOrgId,
  orgs,
  orgsLoading,
  onOrgChange,
  isPlatformAdmin = false,
}: {
  userInitial: string
  title: string
  activeOrgId: string | null
  orgs: Org[]
  orgsLoading: boolean
  onOrgChange: (orgId: string) => void
  isPlatformAdmin?: boolean
}) {
  return (
    <header className="hidden md:flex border-b border-border/50 bg-card/80 backdrop-blur-xl px-8 sticky top-0 z-30 h-[68px] items-center justify-between transition-all duration-200">
      <div className="flex-1 flex items-center">
        {title && <h1 className="text-xl font-brand font-semibold tracking-tight">{title}</h1>}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {/* Organization Selector — hidden for platform admins (always on Bekaa) */}
        {isPlatformAdmin ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border/50 bg-transparent text-sm text-foreground">
            <Building2 className="h-4 w-4 opacity-70" />
            <span>Bekaa</span>
          </div>
        ) : (
          <div className="w-[200px]">
            <Select value={activeOrgId ?? undefined} onValueChange={onOrgChange}>
              <SelectTrigger className="h-9 bg-transparent border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Building2 className="h-4 w-4 opacity-70" />
                  <SelectValue placeholder={orgsLoading ? "Loading..." : "Select Organization"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {orgs.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
                {orgs.length === 0 && !orgsLoading && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">No organizations</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <button
          className="bell-spell relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ background: "#8fa89b" }} />
        </button>

        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(143,168,155,0.15)", border: "1px solid rgba(143,168,155,0.3)", color: "#8fa89b" }}>
          {userInitial}
        </div>
      </div>
    </header>
  )
}
