import { useEffect, useState } from "react";
import { useSession } from "../lib/auth-client";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { TrendingUp, ClipboardCheck, AlertCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AssessmentSummary {
  assessment_id: string;
  name: string;
  state: string;
  scf_version_id: string;
  scf_version_label?: string;
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Welcome banner */}
      <motion.div variants={itemVariants} className="rounded-2xl glass-premium p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-brand font-bold text-foreground">
            {greeting}, <span className="text-gradient-premium">{session?.user?.name?.split(" ")[0] ?? "User"}</span> 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Welcome to your Standard compliance control center. Here's an overview of your security posture across the organization.
          </p>
        </div>
      </motion.div>

      {/* Bento Grid Stats */}
      <motion.div variants={itemVariants} className="bento-grid">
        <StatCard icon={<ClipboardCheck className="h-6 w-6" />} label="Total Assessments" value={stats.total} color="primary" />
        <StatCard icon={<Clock className="h-6 w-6" />} label="In Progress" value={stats.inProgress} color="warning" />
        <StatCard icon={<TrendingUp className="h-6 w-6" />} label="Approved" value={stats.approved} color="success" />
        <StatCard icon={<AlertCircle className="h-6 w-6" />} label="Pending Review" value={stats.pending} color="info" />
      </motion.div>

      {/* Recent assessments */}
      <motion.div variants={itemVariants} className="rounded-2xl glass-panel overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 dark:border-white/10 bg-white/5">
          <h2 className="text-lg font-brand font-semibold text-foreground">Recent Assessments</h2>
          <Link to="/assessments" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium hover-lift inline-block">
            View All →
          </Link>
        </div>

        <div className="p-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </motion.div>
            ) : assessments.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="text-5xl mb-4 animate-bounce">📋</div>
                <h3 className="text-lg font-medium text-foreground mb-2">No assessments yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create your first security assessment to begin your compliance journey.</p>
                <Link to="/assessments" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all hover:-translate-y-0.5">
                  + New Assessment
                </Link>
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider bg-black/5 dark:bg-white/5">
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Framework</th>
                      <th className="px-6 py-4 font-medium">State</th>
                      <th className="px-6 py-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {assessments.slice(0, 8).map((a, i) => (
                      <motion.tr 
                        key={a.assessment_id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-white/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">
                          <Link to={`/assessments/${a.assessment_id}`} className="group-hover:text-primary transition-colors block">
                            {a.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{a.scf_version_label || a.scf_version_id}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${stateStyle(a.state)}`}>
                            {a.state.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
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
    primary: "bg-primary/20 text-primary dark:bg-primary/10",
    warning: "bg-warning/20 text-warning dark:bg-warning/10",
    success: "bg-success/20 text-success dark:bg-success/10",
    info: "bg-info/20 text-info dark:bg-info/10",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="bento-card group"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500" style={{ color: `var(--${color})` }} />
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl backdrop-blur-md border border-white/10 ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-4xl font-brand font-bold tracking-tight text-foreground relative z-10">{value}</span>
    </motion.div>
  );
}

function stateStyle(state: string): string {
  if (state.includes("approved") || state === "closed") return "bg-success/10 text-success border border-success/20";
  if (state.includes("review")) return "bg-warning/10 text-warning border border-warning/20";
  if (state === "failed" || state === "cancelled") return "bg-destructive/10 text-destructive border border-destructive/20";
  return "bg-info/10 text-info border border-info/20";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
