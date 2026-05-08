import { Outlet, Link, useLocation } from "react-router-dom"
import { useSession, signOut } from "@/lib/auth-client"
import { LayoutDashboard, Settings, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardLayout() {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not logged in -> router will handle redirection anyway
  // but just in case:
  if (!session?.user) {
    return null
  }

  const navItems = [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { name: "Settings", path: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="flex min-h-screen break-words w-full bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-col border-r border-border bg-card shadow-sm hidden md:flex h-screen sticky top-0">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-xl font-brand font-medium">
            standard<span className="text-[#00ADE8]">.</span>
          </span>
        </div>
        
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link key={item.name} to={item.path}>
                <div
                  className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-4 flex items-center space-x-3 rounded-md p-2 bg-secondary/50">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center">
            <span className="text-lg font-brand font-medium">
              standard<span className="text-[#00ADE8]">.</span>
            </span>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
