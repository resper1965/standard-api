import { useEffect, useState } from "react";
import { useSession } from "../lib/auth-client";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { TrendingUp, ClipboardCheck, AlertCircle, Clock } from "lucide-react";

interface AssessmentSummary {
  id: string;
  name: string;
  state: string;
  framework_id: string;
  created_at: string;
}

export function DashboardPage() {
  const { data: session } = useSession();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ data: AssessmentSummary[] }>("/api/v1/assessments")
      .then((d) => setAssessments(d.data ?? []))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => !["closed", "archived", "cancelled"].includes(a.state)).length,
    approved: assessments.filter((a) => a.state === "closed").length,
    pending: assessments.filter((a) => a.state?.includes("review")).length,
  };

  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
        <p className="text-lg font-medium text-foreground">
          {greeting}, {session?.user?.name?.split(" ")[0] ?? "User"} 👋
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Here's an overview of your security posture
        </p>
      </div>

      {/* Stats grid — full width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label="Total Assessments" value={stats.total} color="primary" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="In Progress" value={stats.inProgress} color="warning" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Approved" value={stats.approved} color="success" />
        <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Pending Review" value={stats.pending} color="info" />
      </div>

      {/* Recent assessments */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-base font-semibold text-foreground">Recent Assessments</h2>
          <Link to="/assessments" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
            View All →
          </Link>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-base font-medium text-foreground mb-1">No assessments yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Create your first security assessment to get started</p>
              <Link to="/assessments" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                + New Assessment
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Framework</th>
                    <th className="pb-3 font-medium">State</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {assessments.slice(0, 8).map((a) => (
                    <tr key={a.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        <Link to={`/assessments/${a.id}`} className="hover:text-primary transition-colors">
                          {a.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{a.framework_id}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${stateStyle(a.state)}`}>
                          {a.state.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "warning" | "success" | "info";
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
    </div>
  );
}

function stateStyle(state: string): string {
  if (state.includes("approved") || state === "closed") return "bg-success/10 text-success";
  if (state.includes("review")) return "bg-warning/10 text-warning";
  if (state === "failed" || state === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-info/10 text-info";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
