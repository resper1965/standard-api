import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState } from "react"
import { useAuditLogs } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RefreshCw, ShieldAlert, Filter, ChevronLeft, ChevronRight,
  Key, User, AlertCircle
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatActorId(actorId: string | undefined): {
  label: string
  type: "m2m" | "user" | "system"
} {
  if (!actorId) return { label: "System", type: "system" }
  if (actorId.startsWith("m2m:")) return { label: "M2M Key", type: "m2m" }
  if (actorId.startsWith("system:")) return { label: "System", type: "system" }
  const clean = actorId.replace(/-/g, "")
  return {
    label: clean.length > 8 ? `${clean.slice(0, 4)}…${clean.slice(-4)}` : actorId,
    type: "user",
  }
}

function ActorBadge({ actorId }: { actorId: string | undefined }) {
  const { label, type } = formatActorId(actorId)
  if (type === "m2m") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Key className="h-2.5 w-2.5" /> {label}
    </span>
  )
  if (type === "system") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
      {label}
    </span>
  )
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-default"
      title={actorId}
    >
      <User className="h-2.5 w-2.5" /> {label}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const isError = action.includes("fail") || action.includes("error") || action.includes("reject")
  const isCreate = action.includes("creat") || action.includes("add") || action.includes("invite")
  const isDelete = action.includes("delet") || action.includes("revok") || action.includes("ban") || action.includes("remove")
  const cn = isError
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : isDelete
    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
    : isCreate
    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : "bg-muted text-muted-foreground border-border/50"
  return (
    <span className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded border ${cn}`}>
      {action}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const COMMON_ACTIONS = [
  "api_key.created", "api_key.revoked", "api_key.updated",
  "organization.created", "organization.updated", "organization.activated", "organization.deactivated",
  "member.invited", "member.removed", "member.role_updated",
  "user.banned", "user.unbanned", "user.created", "user.deleted",
  "assessment.created", "assessment.state_changed",
  "webhook.created", "webhook.deleted",
]

type NormalizedLog = {
  id?: string
  action: string
  actorId?: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export function AuditLogsPage() {
  useDocumentTitle("Audit Logs");
  const [page, setPage] = useState(0)

  // Filters (applied on "Apply" click — committed state drives the query)
  const [filterAction, setFilterAction] = useState("")
  const [filterActor, setFilterActor] = useState("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  // Draft filter state (updated in UI but not yet applied)
  const [draftAction, setDraftAction] = useState("")
  const [draftActor, setDraftActor] = useState("")
  const [draftFrom, setDraftFrom] = useState("")
  const [draftTo, setDraftTo] = useState("")

  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useAuditLogs(page, {
    action: filterAction,
    actorId: filterActor,
    from: filterFrom,
    to: filterTo,
  })

  const forbidden = (error as { status?: number } | null)?.status === 403

  const rawItems = data?.data ?? data?.events ?? []
  const logs: NormalizedLog[] = (rawItems as Record<string, unknown>[]).map((item) => ({
    id: item.id as string | undefined,
    action: (item.action ?? item.event_type ?? item.event ?? "unknown") as string,
    actorId: (item.actor_id ?? item.actorId ?? "system") as string,
    targetId: (item.target_id ?? item.targetId ?? item.resource_id ?? item.resourceId ?? "") as string,
    metadata: (item.metadata_safe ?? item.metadata ?? {}) as Record<string, unknown>,
    createdAt: (item.created_at ?? item.createdAt ?? item.timestamp ?? new Date().toISOString()) as string,
  }))

  const hasMore = logs.length > PAGE_SIZE
  const visibleLogs = logs.slice(0, PAGE_SIZE)

  const handleFilterApply = () => {
    setFilterAction(draftAction)
    setFilterActor(draftActor)
    setFilterFrom(draftFrom)
    setFilterTo(draftTo)
    setPage(0)
  }

  const handleFilterReset = () => {
    setDraftAction(""); setDraftActor(""); setDraftFrom(""); setDraftTo("")
    setFilterAction(""); setFilterActor(""); setFilterFrom(""); setFilterTo("")
    setPage(0)
  }

  const activeFilters = !!(filterAction || filterActor || filterFrom || filterTo)
  const loading = isLoading || isFetching

  if (forbidden) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive opacity-60" />
      <div>
        <p className="font-semibold text-foreground">Insufficient Permissions</p>
        <p className="text-sm text-muted-foreground mt-1">
          Platform admin access is required to view audit logs.
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-0">
            Security events and system actions across your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className={`gap-2 cursor-pointer ${showFilters ? "border-primary text-primary" : ""}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <select
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                value={draftAction}
                onChange={e => setDraftAction(e.target.value)}
              >
                <option value="">All actions</option>
                {COMMON_ACTIONS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Actor ID / Email</Label>
              <Input
                placeholder="UUID or m2m:..."
                value={draftActor}
                onChange={e => setDraftActor(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From date</Label>
              <Input
                type="date"
                value={draftFrom}
                onChange={e => setDraftFrom(e.target.value)}
                className="text-sm cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To date</Label>
              <Input
                type="date"
                value={draftTo}
                onChange={e => setDraftTo(e.target.value)}
                className="text-sm cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleFilterApply} className="cursor-pointer">
              Apply Filters
            </Button>
            <Button size="sm" variant="ghost" onClick={handleFilterReset} className="cursor-pointer">
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !forbidden && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(error as Error).message ?? "Failed to load audit logs"}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Action</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Actor</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Target</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-muted/60 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No audit events found.
                </td>
              </tr>
            ) : (
              visibleLogs.map((log, i) => {
                const ts = new Date(log.createdAt)
                return (
                  <tr key={log.id ?? i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      <div>{ts.toLocaleDateString()}</div>
                      <div className="text-[10px] opacity-70">{ts.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <ActorBadge actorId={log.actorId} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                      {log.targetId ? (
                        <span title={log.targetId}>
                          {log.targetId.length > 12
                            ? `${log.targetId.slice(0, 8)}…`
                            : log.targetId}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px] max-w-[200px] truncate">
                      {log.metadata && Object.keys(log.metadata).length > 0
                        ? JSON.stringify(log.metadata).slice(0, 80)
                        : "—"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} · {visibleLogs.length} events
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0 || loading}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
