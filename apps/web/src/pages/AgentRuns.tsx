import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { Loader2, Bot, CheckCircle2, XCircle, Clock, Eye, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

interface AgentRun {
  agent_run_id: string;
  agent_id: string;
  agent_version: string;
  model: string;
  status: "running" | "completed" | "failed" | "pending";
  assessment_id: string;
  created_at: string;
  finished_at?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    estimated_cost?: number;
  };
  output?: {
    auditor_thinking_process?: string;
    architect_reasoning_process?: string;
    devops_commands_suggested?: string[];
    [key: string]: any;
  };
}

const AGENT_LABELS: Record<string, { label: string; emoji: string }> = {
  "evidence-evaluator": { label: "Evidence Evaluator", emoji: "🔍" },
  "incident-triager": { label: "Incident Triager", emoji: "🚨" },
  "board-translator": { label: "Board Translator", emoji: "📊" },
  "vendor-scanner": { label: "Vendor Scanner", emoji: "📋" },
  "poam-architect": { label: "PoAM Architect", emoji: "🏗️" },
  "ropa-analyzer": { label: "RoPA Analyzer", emoji: "🔐" },
  "dpia-assessor": { label: "DPIA Assessor", emoji: "⚖️" },
};

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Completed" };
    case "failed":
      return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "Failed" };
    case "running":
      return { icon: Activity, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20", label: "Running", animate: true };
    default:
      return { icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", label: "Pending" };
  }
}

const PAGE_SIZE = 20;

export function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchRuns = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const d = await api<{ data: AgentRun[] }>(
        `/api/v1/agent-runs?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`
      );
      const fetched = d.data ?? [];
      setRuns((prev) => (append ? [...prev, ...fetched] : fetched));
      setHasMore(fetched.length === PAGE_SIZE);
      setPage(pageNum);
    } catch {
      if (!append) setRuns([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(0);
  }, [fetchRuns]);

  const filteredRuns = runs.filter((r) => {
    if (filterAgent !== "all" && r.agent_id !== filterAgent) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: runs.length,
    running: runs.filter((r) => r.status === "running").length,
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
  };

  const totalTokens = runs.reduce((acc, r) => acc + (r.usage?.prompt_tokens ?? 0) + (r.usage?.completion_tokens ?? 0), 0);
  const totalCost = runs.reduce((acc, r) => acc + (r.usage?.estimated_cost ?? 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Runs" value={stats.total} />
        <StatCard label="Running" value={stats.running} valueColor="text-sky-500" />
        <StatCard label="Completed" value={stats.completed} valueColor="text-emerald-500" />
        <StatCard label="Failed" value={stats.failed} valueColor="text-red-500" />
        <StatCard 
          label="Token Usage" 
          value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "—"} 
          subtext={totalCost > 0 ? `$${totalCost.toFixed(2)}` : undefined} 
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <select
          id="agent-filter"
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary backdrop-blur-md transition-all hover:bg-black/30"
        >
          <option value="all">All Agents</option>
          {Object.entries(AGENT_LABELS).map(([id, { label }]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <select
          id="status-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary backdrop-blur-md transition-all hover:bg-black/30"
        >
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="glass-premium rounded-3xl overflow-hidden border-border/20">
        <div className="pt-0 px-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </motion.div>
            ) : filteredRuns.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-medium text-foreground">No agent runs found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Agent runs are created automatically when assessments trigger AI analysis.
                </p>
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-4 font-medium">Agent</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Model</th>
                        <th className="px-6 py-4 font-medium">Tokens</th>
                        <th className="px-6 py-4 font-medium">Created</th>
                        <th className="px-6 py-4 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <AnimatePresence>
                        {filteredRuns.map((run, i) => {
                          const agentInfo = AGENT_LABELS[run.agent_id] ?? { label: run.agent_id, emoji: "🤖" };
                          const status = statusConfig(run.status);
                          const StatusIcon = status.icon;
                          const tokens = (run.usage?.prompt_tokens ?? 0) + (run.usage?.completion_tokens ?? 0);

                          return (
                            <Dialog key={run.agent_run_id}>
                              <motion.tr 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group hover:bg-white/5 transition-colors relative"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-xl ${run.status === 'running' ? 'animate-aura' : ''}`}>
                                      {agentInfo.emoji}
                                    </div>
                                    <div>
                                      <div className="font-bold text-foreground">{agentInfo.label}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">v{run.agent_version}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
                                    <StatusIcon className={`h-3 w-3 ${status.animate ? "animate-spin" : ""}`} />
                                    {status.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-mono text-muted-foreground bg-black/20 dark:bg-white/10 px-2 py-1 rounded-md border border-white/5">
                                    {run.model}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground font-medium">
                                  {tokens > 0 ? `${(tokens / 1000).toFixed(1)}k` : "—"}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">
                                  {new Date(run.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                  <DialogTrigger asChild>
                                    <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </DialogTrigger>
                                </td>
                              </motion.tr>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-premium border-white/20">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-xl font-brand">
                                    <span className="text-2xl">{agentInfo.emoji}</span>
                                    {agentInfo.label} Output
                                  </DialogTitle>
                                  <DialogDescription className="text-muted-foreground">
                                    Reasoning and results for run <span className="font-mono text-xs">{run.agent_run_id.slice(0, 8)}</span>...
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  {run.output?.auditor_thinking_process && (
                                    <div className="rounded-xl border border-white/10 p-5 bg-black/20 backdrop-blur-md">
                                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                                        <Bot className="h-4 w-4" /> Auditor Thinking Process
                                      </h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                        {run.output.auditor_thinking_process}
                                      </p>
                                    </div>
                                  )}
                                  {run.output?.architect_reasoning_process && (
                                    <div className="rounded-xl border border-white/10 p-5 bg-black/20 backdrop-blur-md">
                                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-sky-400">
                                        <Bot className="h-4 w-4" /> Architect Reasoning
                                      </h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                        {run.output.architect_reasoning_process}
                                      </p>
                                    </div>
                                  )}
                                  {run.output?.devops_commands_suggested && run.output.devops_commands_suggested.length > 0 && (
                                    <div className="rounded-xl border border-white/10 p-5 bg-black/20 backdrop-blur-md">
                                      <h4 className="text-sm font-semibold mb-3">DevOps Commands</h4>
                                      <div className="space-y-2">
                                        {run.output.devops_commands_suggested.map((cmd, idx) => (
                                          <pre key={idx} className="text-xs p-3 rounded-lg bg-black/40 border border-white/5 overflow-x-auto text-emerald-400 font-mono">
                                            {cmd}
                                          </pre>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Raw Output Schema</h4>
                                    <pre className="text-xs p-4 rounded-xl bg-black/40 border border-white/5 overflow-x-auto text-foreground/70 font-mono">
                                      {JSON.stringify(run.output || {}, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {hasMore && !loading && (
            <div className="flex justify-center py-4 border-t border-white/5 bg-black/5 dark:bg-white/5">
              <button
                onClick={() => fetchRuns(page + 1, true)}
                disabled={loadingMore}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-5 py-2 rounded-full hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, valueColor = "text-foreground", subtext }: { label: string, value: string | number, valueColor?: string, subtext?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-premium p-5 rounded-2xl">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-brand font-bold ${valueColor}`}>{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </motion.div>
  );
}
