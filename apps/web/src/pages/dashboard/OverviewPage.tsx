import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Key, Users, Zap, ArrowUpRight, Activity, HeartPulse } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { API_URL } from "@/lib/config"
import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { useQuery } from "@tanstack/react-query"
import { qk, useHealthStatus } from "@/lib/queries"
import { PageHeader } from "@/components/ui/PageHeader"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

type AgentUsage = {
  agent_type: string
  total_tokens: number
  total_calls: number
}

type Org = {
  id: string
  name: string
  slug?: string
  role?: string
  status?: string
}

export function OverviewPage() {
  useDocumentTitle("Overview")
  const { data: session, isPending: sessionLoading } = useSession()
  const { orgId } = useActiveOrg()
  const hasActiveOrg = !!orgId

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: qk.userOrgs(),
    queryFn: () => api<{ data: Org[] }>("/api/v1/users/me/organizations"),
    enabled: !!session,
  })

  const { data: usersData } = useQuery({
    queryKey: qk.adminUsers(0, ""),
    queryFn: () => api<{ data: unknown[]; total: number }>("/api/v1/admin/users?limit=1"),
    enabled: !!session,
  })

  const { data: keysData } = useQuery({
    queryKey: qk.orgApiKeys(orgId ?? ""),
    queryFn: () => api<{ data: unknown[] }>(`/api/v1/organizations/${orgId}/api-keys`),
    enabled: !!orgId,
  })

  const { data: healthData } = useHealthStatus(API_URL)

  const { data: usageData } = useQuery({
    queryKey: qk.adminUsage(),
    queryFn: () => api<{ usage: unknown[]; agent_usage: AgentUsage[] }>("/api/v1/admin/usage"),
    enabled: !!session,
  })

  const loading = sessionLoading || orgsLoading

  const orgs: Org[] = orgsData?.data ?? []
  const userCount = usersData?.total ?? 0
  const keyCount = keysData?.data?.length ?? 0
  const apiHealth = healthData ?? "unknown"
  const agentUsage: AgentUsage[] = usageData?.agent_usage ?? []
  const totalTokens = agentUsage.reduce((sum, a) => sum + (a.total_tokens || 0), 0)

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

  if (loading) {
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

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        title="Overview"
        description="Platform status and activity summary"
      />
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {getGreeting()},{" "}
          <span className="text-gradient-premium font-semibold">
            {session?.user?.name?.split(" ")[0] || "there"}
          </span>
          .{" "}
          {hasActiveOrg
            ? "Organization context active."
            : "No active organization — select one above."}
        </p>
      </div>

      {/* ── Platform Stat Cards ────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <div className="ds-fade-up ds-fade-up--1">
          <StatCard
            label="Organizations"
            value={orgs.length}
            sub="Managed tenants"
            icon={<Building2 className="h-4 w-4" />}
            accent="primary"
          />
        </div>
        <div className="ds-fade-up ds-fade-up--2">
          <StatCard
            label="API Keys"
            value={keyCount}
            sub="Active in current org"
            icon={<Key className="h-4 w-4" />}
            accent="primary"
          />
        </div>
        <div className="ds-fade-up ds-fade-up--3">
          <StatCard
            label="Users"
            value={userCount || "—"}
            sub="Platform accounts"
            icon={<Users className="h-4 w-4" />}
            accent="primary"
          />
        </div>
        <div className="ds-fade-up ds-fade-up--4">
          <StatCard
            label="API Status"
            value={healthLabel[apiHealth]}
            sub="standard-api.bekaa.eu"
            icon={<HeartPulse className="h-4 w-4" />}
            accent={
              apiHealth === "operational"
                ? "primary"
                : apiHealth === "down"
                ? "destructive"
                : "muted"
            }
            showPulse={apiHealth === "operational"}
          />
        </div>
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
              <Link
                to="/dashboard/organizations"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
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
                <p className="text-xs text-muted-foreground">
                  Create one to start managing API access
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {orgs.slice(0, 6).map((org: Org) => (
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
                        <span className="text-muted-foreground text-xs mt-0.5 truncate">
                          {org.slug || org.id}
                        </span>
                      </div>
                    </div>
                    <Badge variant="muted">{org.role || "org_admin"}</Badge>
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
                <p className="text-xs text-muted-foreground">
                  Metrics appear after API calls are made
                </p>
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
                  <div
                    key={agent.agent_type}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs text-foreground capitalize truncate max-w-[140px]">
                      {agent.agent_type.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs text-muted-foreground">
                        {agent.total_calls} calls
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {agent.total_tokens.toLocaleString()} tok
                      </span>
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
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">Generate and revoke keys</p>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
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
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">Integration guides and API reference</p>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
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
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">API status and diagnostics</p>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  showPulse,
}: {
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
    muted: "text-muted-foreground",
  }
  const bgMap = {
    primary: "bg-primary/10",
    destructive: "bg-destructive/10",
    muted: "bg-muted/60",
  }
  return (
    <Card className="border-border/60 bg-card shadow-none hover-lift group card-spell">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div
          className={`h-9 w-9 rounded-lg ${bgMap[accent]} flex items-center justify-center ${colorMap[accent]} opacity-70 group-hover:opacity-100 transition-opacity`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl stat-number tracking-tight animate-count-up ${
            accent === "destructive" ? "text-destructive" : "text-foreground"
          }`}
        >
          {showPulse && (
            <span className="inline-block h-2 w-2 rounded-full mr-2 animate-pulse align-middle" style={{ background: 'var(--ds-success)' }} />
          )}
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
