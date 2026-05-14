import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Database, Users, ShieldAlert, ArrowUpRight, TrendingUp } from "lucide-react"
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

export function OverviewPage() {
  const { data: session, isPending: sessionLoading } = useSession()
  const hasActiveOrg = !!session?.session?.activeOrganizationId

  const [assessments, setAssessments] = useState<any[]>([])
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!session?.session?.activeOrganizationId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [assessmentsData, frameworksData] = await Promise.all([
          apiClient<{ data: any[] }>("/api/v1/assessments").catch(() => ({ data: [] })),
          apiClient<{ data: any[] }>("/api/v1/scf/frameworks").catch(() => ({ data: [] }))
        ])
        setAssessments(assessmentsData?.data ?? [])
        setFrameworks(frameworksData?.data ?? [])
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    if (!sessionLoading) fetchData()
  }, [session?.session?.activeOrganizationId, sessionLoading])

  const greeting = `${getGreeting()}, ${session?.user?.name?.split(" ")[0] || "there"}`

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
          {greeting}. {hasActiveOrg ? "Organization context active." : "No active organization — select one in Settings."}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <StatCard
          label="Pending Reviews"
          value={assessments.filter(a => a.state?.includes('under_review')).length}
          sub="Awaiting manual approval"
          icon={<Activity className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="SCF Frameworks"
          value={frameworks.length}
          sub="Loaded in catalog"
          icon={<Database className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Active Assessments"
          value={assessments.length}
          sub="Total in this organization"
          icon={<Users className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Security Events"
          value={0}
          sub="No recent alerts"
          icon={<ShieldAlert className="h-4 w-4" />}
          accent="muted"
        />
      </div>

      {/* ── Content Grid ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-7">
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
                      {assessment.state?.replace(/_/g, ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/60 bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agent Telemetry</CardTitle>
            <CardDescription className="mt-0.5">Token usage and confidence metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-[180px] items-center justify-center border border-dashed border-border/60 rounded-lg">
              <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                <TrendingUp className="h-5 w-5 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No agent runs yet</p>
              <p className="text-xs text-muted-foreground">Metrics will appear after assessments run</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent }: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  accent: "primary" | "destructive" | "muted"
}) {
  const colorMap = {
    primary: "text-primary",
    destructive: "text-destructive",
    muted: "text-muted-foreground"
  }
  return (
    <Card className="border-border/60 bg-card shadow-none hover-lift group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`${colorMap[accent]} opacity-60 group-hover:opacity-100 transition-opacity`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight animate-count-up ${accent === "destructive" ? "text-destructive" : "text-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
