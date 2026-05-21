import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Database, ShieldAlert, ArrowUpRight, TrendingUp, CheckSquare, Zap } from "lucide-react"
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

const stateVariant: Record<string, "success" | "warning" | "info" | "muted" | "default"> = {
  draft: "muted",
  documents_uploaded: "info",
  documents_ingested: "info",
  framework_selected: "info",
  soa_drafted: "warning",
  soa_under_review: "warning",
  gap_analysis_drafted: "warning",
  maturity_assessed: "default",
  closed: "success",
  archived: "muted",
  failed: "destructive" as any,
}

interface OrgDashboard {
  compliance_avg_pct: number
  total_open_poams: number
  total_critical_findings: number
  total_high_findings: number
  total_assessments: number
  assessments_by_state: Record<string, number>
}

interface AgentUsageRow {
  agent_name: string
  total_tokens: number
  avg_confidence?: number
  run_count?: number
}

interface UsageRow {
  model: string
  total_tokens: number
  created_at: string
}

export function OverviewPage() {
  const { data: session, isPending: sessionLoading } = useSession()
  const orgId = session?.session?.activeOrganizationId

  const [assessments, setAssessments] = useState<any[]>([])
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [orgDash, setOrgDash] = useState<OrgDashboard | null>(null)
  const [agentUsage, setAgentUsage] = useState<AgentUsageRow[]>([])
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!orgId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [assessmentsData, frameworksData, orgDashData, usageData] = await Promise.allSettled([
          apiClient<{ data: any[] }>("/api/v1/assessments"),
          apiClient<{ data: any[] }>("/api/v1/scf/frameworks"),
          apiClient<OrgDashboard>(`/api/v1/organizations/${orgId}/dashboard`),
          apiClient<{ usage: UsageRow[]; agent_usage: AgentUsageRow[] }>("/api/v1/admin/usage"),
        ])

        if (assessmentsData.status === "fulfilled") setAssessments(assessmentsData.value?.data ?? [])
        if (frameworksData.status === "fulfilled") setFrameworks(frameworksData.value?.data ?? [])
        if (orgDashData.status === "fulfilled") setOrgDash(orgDashData.value ?? null)
        if (usageData.status === "fulfilled") {
          setAgentUsage(usageData.value?.agent_usage ?? [])
          setUsageRows(usageData.value?.usage ?? [])
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    if (!sessionLoading) fetchData()
  }, [orgId, sessionLoading])

  const greeting = `${getGreeting()}, ${session?.user?.name?.split(" ")[0] || "there"}`
  const totalTokens = usageRows.reduce((s, r) => s + (r.total_tokens || 0), 0)

  if (loading || sessionLoading) {
    return (
      <div className="space-y-8 animate-slide-up">
        <Skeleton className="h-5 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
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
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {greeting}.{" "}
          {orgId
            ? "Organization context active."
            : "No active organization — select one in Settings."}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <StatCard
          label="Compliance Avg"
          value={orgDash ? `${orgDash.compliance_avg_pct.toFixed(1)}%` : "—"}
          sub={orgDash ? `Across ${orgDash.total_assessments} assessments` : "No data yet"}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="SCF Frameworks"
          value={frameworks.length > 0 ? String(frameworks.length) : "—"}
          sub="Loaded in catalog"
          icon={<Database className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Open POAMs"
          value={orgDash != null ? String(orgDash.total_open_poams) : "—"}
          sub="Remediation items in progress"
          icon={<CheckSquare className="h-4 w-4" />}
          accent={orgDash && orgDash.total_open_poams > 0 ? "warning" : "primary"}
        />
        <StatCard
          label="Critical Findings"
          value={orgDash != null ? String(orgDash.total_critical_findings) : "—"}
          sub={orgDash && orgDash.total_high_findings > 0 ? `+ ${orgDash.total_high_findings} high` : "No critical issues"}
          icon={<ShieldAlert className="h-4 w-4" />}
          accent={orgDash && orgDash.total_critical_findings > 0 ? "destructive" : "muted"}
        />
      </div>

      {/* ── Content Grid ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Assessments */}
        <Card className="lg:col-span-4 border-border/60 bg-card shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Assessments</CardTitle>
                <CardDescription className="mt-0.5">Status of ongoing SCF assessments</CardDescription>
              </div>
              <Link to="/dashboard/assessments" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/60 rounded-lg">
                <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <Activity className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No assessments yet</p>
                <p className="text-xs text-muted-foreground">Create one to start your compliance journey</p>
              </div>
            ) : (
              <div className="space-y-1">
                {assessments.slice(0, 5).map((assessment) => (
                  <Link
                    key={assessment.assessment_id}
                    to={`/dashboard/assessments/${assessment.assessment_id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {assessment.name}
                      </span>
                      <span className="text-muted-foreground text-xs mt-0.5">
                        Created {new Date(assessment.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={stateVariant[assessment.state] || "muted"}>
                      {assessment.state?.replace(/_/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Telemetry */}
        <Card className="lg:col-span-3 border-border/60 bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agent Telemetry</CardTitle>
            <CardDescription className="mt-0.5">Token usage and confidence metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {agentUsage.length === 0 && usageRows.length === 0 ? (
              <div className="flex flex-col h-[180px] items-center justify-center border border-dashed border-border/60 rounded-lg">
                <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <TrendingUp className="h-5 w-5 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No agent runs yet</p>
                <p className="text-xs text-muted-foreground">Metrics will appear after assessments run</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary row */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    Total tokens used
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {totalTokens.toLocaleString()}
                  </span>
                </div>
                {/* Per-agent breakdown */}
                <div className="space-y-1.5">
                  {agentUsage.slice(0, 5).map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/20 text-sm">
                      <span className="text-muted-foreground truncate text-xs">{row.agent_name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.avg_confidence != null && (
                          <span className="text-xs text-muted-foreground">
                            {(row.avg_confidence * 100).toFixed(0)}% conf.
                          </span>
                        )}
                        <span className="text-xs font-medium tabular-nums">
                          {(row.total_tokens || 0).toLocaleString()} tok
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent }: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: "primary" | "destructive" | "warning" | "muted"
}) {
  const colorMap = {
    primary: "text-primary",
    destructive: "text-destructive",
    warning: "text-amber-500",
    muted: "text-muted-foreground"
  }
  return (
    <Card className="border-border/60 bg-card shadow-none hover-lift group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`${colorMap[accent]} opacity-60 group-hover:opacity-100 transition-opacity`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight animate-count-up ${accent === "destructive" ? "text-destructive" : accent === "warning" ? "text-amber-500" : "text-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
