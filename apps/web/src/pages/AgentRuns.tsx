import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, Bot, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";

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
      return { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Completed" };
    case "failed":
      return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" };
    case "running":
      return { icon: Loader2, color: "text-sky-500", bg: "bg-sky-500/10", label: "Running", animate: true };
    default:
      return { icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10", label: "Pending" };
  }
}

export function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    api<{ data: AgentRun[] }>("/api/v1/agent-runs")
      .then((d) => setRuns(d.data ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Runs"
        description="Monitor AI agent execution across all assessments"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Runs</div>
            <div className="text-2xl font-semibold mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-sky-500 uppercase tracking-wider">Running</div>
            <div className="text-2xl font-semibold mt-1">{stats.running}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-semibold mt-1">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-red-500 uppercase tracking-wider">Failed</div>
            <div className="text-2xl font-semibold mt-1">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Token Usage</div>
            <div className="text-2xl font-semibold mt-1">{totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "—"}</div>
            {totalCost > 0 && <div className="text-xs text-muted-foreground mt-0.5">${totalCost.toFixed(2)}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          id="agent-filter"
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="pt-0 px-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium text-foreground">No agent runs found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Agent runs are created automatically when assessments trigger AI analysis.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Agent</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Model</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tokens</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredRuns.map((run) => {
                    const agentInfo = AGENT_LABELS[run.agent_id] ?? { label: run.agent_id, emoji: "🤖" };
                    const status = statusConfig(run.status);
                    const StatusIcon = status.icon;
                    const tokens = (run.usage?.prompt_tokens ?? 0) + (run.usage?.completion_tokens ?? 0);

                    return (
                      <tr key={run.agent_run_id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{agentInfo.emoji}</span>
                            <div>
                              <div className="font-medium text-foreground">{agentInfo.label}</div>
                              <div className="text-xs text-muted-foreground">v{run.agent_version}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                            <StatusIcon className={`h-3 w-3 ${status.animate ? "animate-spin" : ""}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
                            {run.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tokens > 0 ? `${(tokens / 1000).toFixed(1)}k` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
