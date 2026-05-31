import { useState, useEffect, useCallback } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RefreshCw, ShieldAlert, Filter, ChevronLeft, ChevronRight,
  Key, User, AlertCircle
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditLog = {
  id?: string
  event?: string
  action?: string
  actorId?: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatActorId(actorId: string | undefined): {
  label: string
  type: "m2m" | "user" | "system"
} {
  if (!actorId) return { label: "System", type: "system" }
  if (actorId.startsWith("m2m:")) return { label: "M2M Key", type: "m2m" }
  if (actorId.startsWith("system:")) return { label: "System", type: "system" }
  // Show first 4 + last 4 chars of UUID
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

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [filterAction, setFilterAction] = useState("")
  const [filterActor, setFilterActor] = useState("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const fetchLogs = useCallback(async (currentPage: number) => {
    setLoading(true)
    setError(null)
    setForbidden(false)

    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE + 1)) // fetch one extra to detect hasMore
    params.set("offset", String(currentPage * PAGE_SIZE))
    if (filterAction) params.set("action", filterAction)
    if (filterActor) params.set("actor_id", filterActor)
    if (filterFrom) params.set("from", new Date(filterFrom).toISOString())
    if (filterTo) params.set("to", new Date(filterTo + "T23:59:59").toISOString())

    try {
      const res = await api<{ data?: AuditLog[]; events?: AuditLog[] }>(
        `/api/v1/admin/security-events?${params}`
      )
      const items: AuditLog[] = (res?.data ?? res?.events ?? []) as AuditLog[]
      setHasMore(items.length > PAGE_SIZE)
      setLogs(items.slice(0, PAGE_SIZE))
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true)
      } else {
        setError(e instanceof Error ? e.message : "Failed to load audit logs")
      }
    } finally {
      setLoading(false)
    }
  }, [filterAction, filterActor, filterFrom, filterTo])

  useEffect(() => {
    setPage(0)
    fetchLogs(0)
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchLogs(newPage)
  }

  const handleFilterApply = () => {
    setPage(0)
    fetchLogs(0)
  }

  const handleFilterReset = () => {
    setFilterAction("")
    setFilterActor("")
    setFilterFrom("")
    setFilterTo("")
  }

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
          <h2 className="text-2xl font-semibold tracking-tight">Audit Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">
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
            {(filterAction || filterActor || filterFrom || filterTo) && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(page)}
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
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
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
                value={filterActor}
                onChange={e => setFilterActor(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From date</Label>
              <Input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="text-sm cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To date</Label>
              <Input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
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
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
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
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No audit events found.
                </td>
              </tr>
            ) : (
              logs.map((log, i) => {
                const action = log.action ?? log.event ?? "unknown"
                const ts = new Date(log.createdAt)
                return (
                  <tr key={log.id ?? i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      <div>{ts.toLocaleDateString()}</div>
                      <div className="text-[10px] opacity-70">{ts.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={action} />
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
            Page {page + 1} · {logs.length} events
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0 || loading}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
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
