import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Key, Users, Zap, ArrowUpRight, Activity, HeartPulse } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api"
import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

interface PlatformMetrics {
  totalOrgs: number
  totalUsers: number
  totalApiKeys: number
  apiHealth: "operational" | "degraded" | "down" | "unknown"
}

interface AgentUsage {
  agent_type: string
  total_tokens: number
  total_calls: number
}

export function OverviewPage() {
  const { data: session, isPending: sessionLoading } = useSession()
  const hasActiveOrg = !!(session?.session as any)?.activeOrganizationId

  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalOrgs: 0, totalUsers: 0, totalApiKeys: 0, apiHealth: "unknown"
  })
  const [orgs, setOrgs] = useState<any[]>([])
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!session) { setLoading(false); return }
      const orgId = (session.session as any)?.activeOrganizationId
      setLoading(true)
      try {
        // Fetch organizations via our API
        let orgList: any[] = []
        try {
          const orgRes = await apiClient<{ data: any[] }>("/api/v1/users/me/organizations")
          orgList = Array.isArray(orgRes?.data) ? orgRes.data : []
        } catch { /* no orgs */ }
        setOrgs(orgList)

        // Fetch users count
        let userCount = 0
        try {
          const usersRes = await apiClient<{ data: any[]; total: number }>("/api/v1/admin/users?limit=1")
          userCount = usersRes?.total ?? 0
        } catch { /* non-admin */ }

        // Fetch API keys count for active org
        let keyCount = 0
        if (orgId) {
          try {
            const keysRes = await apiClient<{ data: any[] }>(`/api/v1/organizations/${orgId}/api-keys`)
            keyCount = keysRes?.data?.length ?? 0
          } catch { /* no keys yet */ }
        }

        // Fetch API health
        let health: PlatformMetrics["apiHealth"] = "unknown"
        try {
          const healthRes = await fetch(
            `${import.meta.env.VITE_API_URL || "https://standard-api.bekaa.eu"}/health`
          )
          health = healthRes.ok ? "operational" : "degraded"
        } catch { health = "down" }

        // Fetch agent usage (platform telemetry)
        if (orgId) {
          try {
            const usageRes = await apiClient<{ usage: any[]; agent_usage: AgentUsage[] }>("/api/v1/admin/usage")
            setAgentUsage(usageRes?.agent_usage ?? [])
          } catch { /* no admin access or no usage */ }
        }

        setMetrics({
          totalOrgs: orgList.length,
          totalUsers: userCount,
          totalApiKeys: keyCount,
          apiHealth: health,
        })
      } catch (err) {
        console.error("Failed to fetch platform data:", err)
      } finally {
        setLoading(false)
      }
    }
    if (!sessionLoading) fetchData()
  }, [session, sessionLoading])

  // greeting rendered inline in JSX with gradient name span

  if (loading || sessionLoading) {
    return (
      <div className="space-y-8 animate-slide-up">
        <Skeleton className="h-5 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-7">
          <Skeleton className="h-[280px] lg:col-span-4 rounded-xl" />
          <Skeleton className="h-[280px] lg:col-span-3 rounded-xl" />
        </div>
      </div>
    )
  }

  const healthColor = {
    operational: "text-emerald-500",
    degraded: "text-amber-500",
    down: "text-destructive",
    unknown: "text-muted-foreground",
  }
  const healthLabel = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    unknown: "Unknown",
  }

  const totalTokens = agentUsage.reduce((sum, a) => sum + (a.total_tokens || 0), 0)

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {getGreeting()}, <span className="text-gradient-premium font-semibold">{session?.user?.name?.split(" ")[0] || "there"}</span>. {hasActiveOrg ? "Organization context active." : "No active organization \u2014 select one above."}
        </p>
      </div>

      {/* ── Platform Stat Cards ────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <StatCard
          label="Organizations"
          value={metrics.totalOrgs}
          sub="Managed tenants"
          icon={<Building2 className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="API Keys"
          value={metrics.totalApiKeys}
          sub="Active in current org"
          icon={<Key className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Users"
          value={metrics.totalUsers || "\u2014"}
          sub="Platform accounts"
          icon={<Users className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="API Status"
          value={healthLabel[metrics.apiHealth]}
          sub="standard-api.bekaa.eu"
          icon={<HeartPulse className="h-4 w-4" />}
          accent={metrics.apiHealth === "operational" ? "primary" : metrics.apiHealth === "down" ? "destructive" : "muted"}
          showPulse={metrics.apiHealth === "operational"}
        />
      </div>

      {/* ── Content Grid ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Organizations List */}
        <Card className="lg:col-span-4 border-border/60 bg-card shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Organizations</CardTitle>
                <CardDescription className="mt-0.5">Your managed tenants</CardDescription>
              </div>
              <Link to="/dashboard/organizations" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {orgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/60 rounded-lg">
                <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No organizations yet</p>
                <p className="text-xs text-muted-foreground">Create one to start managing API access</p>
              </div>
            ) : (
              <div className="space-y-1">
                {orgs.slice(0, 6).map((org: any) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {(org.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">{org.name}</span>
                        <span className="text-muted-foreground text-xs mt-0.5 truncate">{org.slug || org.id}</span>
                      </div>
                    </div>
                    <Badge variant="muted">{org.role || "owner"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Usage Telemetry */}
        <Card className="lg:col-span-3 border-border/60 bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Usage</CardTitle>
            <CardDescription className="mt-0.5">Agent token consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {agentUsage.length === 0 ? (
              <div className="flex flex-col h-[180px] items-center justify-center border border-dashed border-border/60 rounded-lg">
                <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No API usage yet</p>
                <p className="text-xs text-muted-foreground">Metrics appear after API calls are made</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Total tokens consumed</span>
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" />
                    {totalTokens.toLocaleString()}
                  </span>
                </div>
                {agentUsage.slice(0, 5).map((agent) => (
                  <div key={agent.agent_type} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                    <span className="text-xs text-foreground capitalize truncate max-w-[140px]">
                      {agent.agent_type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs text-muted-foreground">{agent.total_calls} calls</span>
                      <span className="text-xs font-medium text-foreground">{agent.total_tokens.toLocaleString()} tok</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/dashboard/api-keys">
          <Card className="border-border/60 bg-card shadow-none hover-lift group cursor-pointer transition-all hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Manage API Keys</p>
                <p className="text-xs text-muted-foreground">Generate and revoke keys</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/sdk">
          <Card className="border-border/60 bg-card shadow-none hover-lift group cursor-pointer transition-all hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">SDK & Documentation</p>
                <p className="text-xs text-muted-foreground">Integration guides and API reference</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/system-health">
          <Card className="border-border/60 bg-card shadow-none hover-lift group cursor-pointer transition-all hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">System Health</p>
                <p className="text-xs text-muted-foreground">API status and diagnostics</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent, showPulse }: {
  label: string
  value: number | string
  sub: string
  icon: React.ReactNode
  accent: "primary" | "destructive" | "muted"
  showPulse?: boolean
}) {
  const colorMap = {
    primary: "text-primary",
    destructive: "text-destructive",
    muted: "text-muted-foreground"
  }
  const bgMap = {
    primary: "bg-primary/10",
    destructive: "bg-destructive/10",
    muted: "bg-muted/60"
  }
  return (
    <Card className="border-border/60 bg-card shadow-none hover-lift group card-spell">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`h-8 w-8 rounded-full ${bgMap[accent]} flex items-center justify-center ${colorMap[accent]} opacity-70 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl stat-number tracking-tight animate-count-up ${accent === "destructive" ? "text-destructive" : "text-foreground"}`}>
          {showPulse && <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse align-middle" />}
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
