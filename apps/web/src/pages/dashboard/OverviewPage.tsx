import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Database, Users, ShieldAlert, Loader2, ArrowUpRight } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api"
import { Link } from "react-router-dom"

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

  if (loading || sessionLoading) {
     return (
       <div className="flex w-full h-[50vh] items-center justify-center">
         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
       </div>
     )
  }

  const greeting = session?.user?.name ? `Welcome back, ${session.user.name}` : "Welcome back"

  return (
    <div className="space-y-8">
      {/* Greeting bar */}
      <p className="text-sm text-muted-foreground">
        {greeting}. {hasActiveOrg ? "Organization context active." : "No active organization — select one in Settings."}
      </p>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border/60 rounded-lg">
                No assessments found in this organization.
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
                      <span className="text-muted-foreground text-xs mt-0.5">{assessment.state?.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[11px] shrink-0">
                      {assessment.scf_version_id?.split('-')[0] || 'N/A'}
                    </span>
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
             <div className="flex h-[180px] items-center justify-center border border-dashed border-border/60 rounded-lg">
                <p className="text-sm text-muted-foreground">No agent runs recorded yet</p>
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
    <Card className="border-border/60 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={colorMap[accent]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight ${accent === "destructive" ? "text-destructive" : "text-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
