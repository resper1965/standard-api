import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Database, Users, ShieldAlert, Loader2 } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api"

const CACHE_BUST_VERSION = "standard-v2.0.1-production-force";
console.log(`[Standard SaaS] Initializing UI. Version: ${CACHE_BUST_VERSION}`);

export function OverviewPage() {
  const { data: session, isPending: sessionLoading } = useSession()
  const hasActiveOrg = !!session?.session?.activeOrganizationId

  const [assessments, setAssessments] = useState<any[]>([])
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!session?.session?.activeOrganizationId) return
      setLoading(true)
      try {
        const [assessmentsRes, frameworksRes] = await Promise.all([
          apiClient("/api/v1/assessments"),
          apiClient("/api/v1/scf/frameworks")
        ])

        if (assessmentsRes.ok) {
          const json = await assessmentsRes.json()
          setAssessments(json.data || [])
        }
        
        if (frameworksRes.ok) {
           const json = await frameworksRes.json()
           setFrameworks(json.data || [])
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [session?.session?.activeOrganizationId])

  if (loading || sessionLoading) {
     return (
       <div className="flex w-full h-[50vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome back to Standard Platform, {session?.user?.name || "Operator"}. 
          {hasActiveOrg ? ` Using Authorized Organization Context` : " (No Active Organization)"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card className="shadow-none border-primary/20 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {assessments.filter(a => a.state && a.state.includes('under_review')).length}
            </div>
            <p className="text-xs text-muted-foreground">Pending manual approvals</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-primary/20 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SCF Frameworks</CardTitle>
            <Database className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{frameworks.length}</div>
            <p className="text-xs text-muted-foreground">Frameworks loaded in DB</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-primary/20 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assessments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assessments.length}</div>
            <p className="text-xs text-muted-foreground">Total assessments mapped</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-destructive/20 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Security Events</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">2</div>
            <p className="text-xs text-destructive/80">RBAC unauthorized attempts</p>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card/40 border-border">
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>View status of ongoing SCF mappings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {assessments.length === 0 ? (
                 <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded opacity-70">
                   No assessments found in this organization.
                 </div>
               ) : (
                 assessments.map((assessment) => (
                   <div key={assessment.assessment_id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                     <div className="flex flex-col">
                       <span className="font-medium text-primary">{assessment.name}</span>
                       <span className="text-muted-foreground text-xs">{assessment.state}</span>
                     </div>
                     <div className="px-2 py-1 rounded bg-accent/10 text-accent font-medium text-xs truncate max-w-[120px]">
                       {assessment.scf_version_id?.split('-')[0] || 'N/A'}
                     </div>
                   </div>
                 ))
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card/40 border-border">
          <CardHeader>
            <CardTitle>Agents Telemetry</CardTitle>
            <CardDescription>Real-time token and confidence metrics.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex h-[150px] items-center justify-center border border-dashed border-border rounded opacity-50">
                [ Chart Stub ]
             </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
