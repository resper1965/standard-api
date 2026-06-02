import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState } from "react"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Key, Plus, Trash2, Loader2, Copy, Check, Pencil,
  ShieldCheck, ShieldOff, Clock, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react"
import { useOrgApiKeys, useCreateApiKey, useDeleteApiKey, useUpdateApiKey } from "@/lib/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyStatus = "active" | "expired" | "revoked"

type ApiKeyRecord = {
  id: string
  name: string
  maskedKey: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  isRevoked: boolean
  status: KeyStatus
  createdAt: string
}

// ─── Scope Groups ─────────────────────────────────────────────────────────────

const SCOPE_GROUPS = [
  {
    label: "Assessments",
    scopes: [
      { value: "assessment:read", description: "Read assessments and their state" },
      { value: "assessment:write", description: "Create and modify assessments" },
      { value: "assessment:transition", description: "Trigger lifecycle state transitions" },
    ],
  },
  {
    label: "Documents",
    scopes: [
      { value: "document:read", description: "Read uploaded documents" },
      { value: "document:write", description: "Upload and create documents" },
      { value: "document:delete", description: "Delete documents" },
    ],
  },
  {
    label: "SCF & Frameworks",
    scopes: [
      { value: "scf:read", description: "Read SCF catalog" },
      { value: "soa:read", description: "Read Scope and Statement of Applicability" },
      { value: "soa:write", description: "Create or edit SoA" },
    ],
  },
  {
    label: "Gap & POA&M",
    scopes: [
      { value: "gap:read", description: "Read Gap Analysis findings" },
      { value: "gap:write", description: "Create or edit Gap Analysis" },
      { value: "poam:read", description: "Read POA&M items" },
      { value: "poam:write", description: "Create or edit POA&M items" },
    ],
  },
  {
    label: "Knowledge Base",
    scopes: [
      { value: "kb:read", description: "Read knowledge base chunks" },
      { value: "kb:search", description: "Run semantic search on the KB" },
    ],
  },
  {
    label: "Agents & Intelligence",
    scopes: [
      { value: "agent:read", description: "Read agent run history" },
      { value: "agent:run", description: "Trigger agent executions" },
      { value: "intelligence:read", description: "Read intelligence outputs" },
      { value: "intelligence:run", description: "Run the Agentic Council" },
    ],
  },
  {
    label: "Reporting",
    scopes: [
      { value: "report:read", description: "Read generated reports" },
      { value: "report:write", description: "Create reports" },
      { value: "report:export", description: "Export reports to PDF/XLSX" },
    ],
  },
  {
    label: "Observability",
    scopes: [
      { value: "audit:read", description: "Read audit logs" },
      { value: "metrics:read", description: "Read system metrics" },
      { value: "usage:read", description: "Read usage statistics" },
    ],
  },
  {
    label: "Workflows & Approvals",
    scopes: [
      { value: "workflow:read", description: "Read workflow status" },
      { value: "workflow:write", description: "Create or cancel workflows" },
      { value: "workflow:signal", description: "Send signals to workflows" },
      { value: "approval:read", description: "Read approval gates" },
    ],
  },
]

const ALL_SCOPES = SCOPE_GROUPS.flatMap(g => g.scopes.map(s => s.value))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExpiryDate(option: string, customDate?: string): string | undefined {
  if (option === "never") return undefined
  if (option === "custom") return customDate ? new Date(customDate).toISOString() : undefined
  const d = new Date()
  if (option === "30d") d.setDate(d.getDate() + 30)
  if (option === "90d") d.setDate(d.getDate() + 90)
  if (option === "1y") d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

/** A key is considered active if it was used within the last 30 days. */
function isRecentlyActive(lastUsedAt: string | null): boolean {
  if (!lastUsedAt) return false
  const diff = Date.now() - new Date(lastUsedAt).getTime()
  return diff < 30 * 86400000
}

function formatExpiry(dateStr: string | null): { label: string; expired: boolean } {
  if (!dateStr) return { label: "Never", expired: false }
  const date = new Date(dateStr)
  const now = new Date()
  if (date < now) {
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
    return { label: `Expired ${days}d ago`, expired: true }
  }
  const days = Math.floor((date.getTime() - now.getTime()) / 86400000)
  if (days === 0) return { label: "Expires today", expired: false }
  if (days < 30) return { label: `in ${days} days`, expired: false }
  return { label: date.toLocaleDateString(), expired: false }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KeyStatus }) {
  if (status === "active") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
      <ShieldCheck className="h-3 w-3" /> Active
    </span>
  )
  if (status === "expired") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Clock className="h-3 w-3" /> Expired
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
      <ShieldOff className="h-3 w-3" /> Revoked
    </span>
  )
}

function ActivityBadge({ active }: { active: boolean }) {
  if (active) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Inactive
    </span>
  )
}

function ScopeBadges({ scopes }: { scopes: string[] }) {
  if (!scopes || scopes.length === 0) return (
    <span className="text-[11px] text-amber-500 font-medium">Full Access</span>
  )
  const visible = scopes.slice(0, 2)
  const rest = scopes.length - 2
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(s => (
        <span key={s} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
          {s}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{rest} more</span>
      )}
    </div>
  )
}

function ScopeSelector({
  selectedScopes,
  onChange,
  fullAccess,
  onFullAccessChange,
}: {
  selectedScopes: string[]
  onChange: (scopes: string[]) => void
  fullAccess: boolean
  onFullAccessChange: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState<string[]>([])

  const toggle = (scope: string) => {
    onChange(selectedScopes.includes(scope)
      ? selectedScopes.filter(s => s !== scope)
      : [...selectedScopes, scope]
    )
  }

  const toggleGroup = (group: typeof SCOPE_GROUPS[0]) => {
    const groupScopes = group.scopes.map(s => s.value)
    const allSelected = groupScopes.every(s => selectedScopes.includes(s))
    onChange(allSelected
      ? selectedScopes.filter(s => !groupScopes.includes(s))
      : [...new Set([...selectedScopes, ...groupScopes])]
    )
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
        <input
          type="checkbox"
          checked={fullAccess}
          onChange={e => onFullAccessChange(e.target.checked)}
          className="mt-0.5 cursor-pointer"
        />
        <div>
          <p className="text-sm font-semibold text-amber-500">Full Access (wildcard)</p>
          <p className="text-xs text-muted-foreground mt-0.5">Grants access to all current and future API endpoints. Use with caution.</p>
        </div>
      </label>

      {!fullAccess && (
        <div className="space-y-2">
          {SCOPE_GROUPS.map(group => {
            const groupScopes = group.scopes.map(s => s.value)
            const allSelected = groupScopes.every(s => selectedScopes.includes(s))
            const someSelected = groupScopes.some(s => selectedScopes.includes(s))
            const isExpanded = expanded.includes(group.label)
            return (
              <div key={group.label} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setExpanded(e => e.includes(group.label) ? e.filter(l => l !== group.label) : [...e, group.label])}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={() => toggleGroup(group)}
                      onClick={e => e.stopPropagation()}
                      className="cursor-pointer"
                    />
                    <span className="text-sm font-medium">{group.label}</span>
                    {someSelected && (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {groupScopes.filter(s => selectedScopes.includes(s)).length}/{groupScopes.length}
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border/30">
                    {group.scopes.map(scope => (
                      <label key={scope.value} className="flex items-start gap-3 px-5 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.value)}
                          onChange={() => toggle(scope.value)}
                          className="mt-0.5 cursor-pointer"
                        />
                        <div>
                          <code className="text-xs font-mono text-primary">{scope.value}</code>
                          <p className="text-xs text-muted-foreground mt-0.5">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function RevokeModal({ keyName, onConfirm, onCancel, loading }: {
  keyName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Revoke API Key</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          You are about to revoke <strong className="text-foreground">"{keyName}"</strong>.
        </p>
        <p className="text-sm text-destructive font-medium mb-6">
          This action cannot be undone. Any integrations using this key will immediately lose access.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Revoke Key
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1 cursor-pointer">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ keyRecord, onSave, onCancel, loading }: {
  keyRecord: ApiKeyRecord
  onSave: (patch: { name?: string; expiresAt?: string | null; scopes?: string[] }) => void
  onCancel: () => void
  loading: boolean
}) {
  const [name, setName] = useState(keyRecord.name)
  const [expiryOption, setExpiryOption] = useState("never")
  const [customDate, setCustomDate] = useState("")
  const [fullAccess, setFullAccess] = useState(keyRecord.scopes.length === 0)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(keyRecord.scopes)

  const handleSave = () => {
    const patch: { name?: string; expiresAt?: string | null; scopes?: string[] } = {}
    if (name !== keyRecord.name) patch.name = name
    const newExpiry = getExpiryDate(expiryOption, customDate) ?? null
    patch.expiresAt = newExpiry
    patch.scopes = fullAccess ? ALL_SCOPES : selectedScopes
    onSave(patch)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border/60 rounded-2xl shadow-xl max-w-lg w-full mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-border/50 shrink-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Pencil className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Edit API Key</h3>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Expiration</Label>
            <div className="grid grid-cols-4 gap-2">
              {[{ v: "never", l: "Never" }, { v: "30d", l: "30 days" }, { v: "90d", l: "90 days" }, { v: "1y", l: "1 year" }].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setExpiryOption(opt.v)}
                  className={`py-2 rounded-lg text-sm border transition-colors cursor-pointer ${expiryOption === opt.v ? "border-primary bg-primary/10 text-primary font-medium" : "border-border/50 hover:bg-muted/40"}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <ScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
              fullAccess={fullAccess}
              onFullAccessChange={setFullAccess}
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-border/50 shrink-0">
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1 cursor-pointer">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ApiKeysPage() {
  useDocumentTitle("API Keys");
  const { orgId } = useActiveOrg()

  // ── Server state (TanStack Query) ──────────────────────────────
  const { data: keysData, isLoading: loading } = useOrgApiKeys(orgId)
  const keys: ApiKeyRecord[] = (keysData?.data ?? []) as ApiKeyRecord[]

  const createMutation = useCreateApiKey(orgId ?? "")
  const deleteMutation = useDeleteApiKey(orgId ?? "")
  const updateMutation = useUpdateApiKey(orgId ?? "")

  // ── Local UI state (modals, forms) ─────────────────────────────
  const [showRevoked, setShowRevoked] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [expiryOption, setExpiryOption] = useState("never")
  const [customDate, setCustomDate] = useState("")
  const [fullAccess, setFullAccess] = useState(true)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [newKeyCopied, setNewKeyCopied] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRecord | null>(null)
  const [editTarget, setEditTarget] = useState<ApiKeyRecord | null>(null)

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    null

  const handleCreate = () => {
    if (!newName.trim() || !orgId) return
    const expiresAt = getExpiryDate(expiryOption, customDate)
    const scopes = fullAccess ? ALL_SCOPES : selectedScopes
    createMutation.mutate(
      { name: newName, ...(expiresAt ? { expiresAt } : {}), scopes },
      {
        onSuccess: (res) => {
          const raw = res as unknown as { data: ApiKeyRecord & { key?: string; raw_key?: string } }
          setNewKey(raw?.data?.key ?? raw?.data?.raw_key ?? null)
          setNewName(""); setExpiryOption("never"); setSelectedScopes([]); setFullAccess(true)
          setIsCreating(false)
        },
      }
    )
  }

  const handleRevoke = () => {
    if (!revokeTarget) return
    deleteMutation.mutate(revokeTarget.id, {
      onSuccess: () => setRevokeTarget(null),
    })
  }

  const handleEdit = (patch: { name?: string; expiresAt?: string | null; scopes?: string[] }) => {
    if (!editTarget) return
    updateMutation.mutate(
      { keyId: editTarget.id, patch },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  const displayedKeys = showRevoked ? keys : keys.filter(k => k.status !== "revoked")

  if (!orgId) return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-0">
            Manage M2M credentials with granular scope control for programmatic access.
          </p>
        </div>
        {!isCreating && !newKey && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-sm shadow-primary/20 cursor-pointer">
            <Plus className="h-4 w-4" />
            Generate New Key
          </Button>
        )}
      </div>

      {/* Error */}
      {mutationError && (
        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {mutationError}
        </div>
      )}

      {/* One-time key display */}
      {newKey && (
        <Card className="border-primary/50 shadow-md shadow-primary/10 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader>
            <CardTitle className="text-lg">Key Generated Successfully</CardTitle>
            <CardDescription className="text-foreground/80 font-medium">
              Copy your API key now — you will not be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <code className="flex-1 rounded-md bg-background px-4 py-3 font-mono text-sm border border-border/60 break-all select-all shadow-inner text-primary font-semibold">
                {newKey}
              </code>
              <Button
                onClick={() => { navigator.clipboard.writeText(newKey); setNewKeyCopied(true); setTimeout(() => setNewKeyCopied(false), 2000) }}
                variant="secondary"
                className="gap-2 shrink-0 h-[46px] cursor-pointer"
              >
                {newKeyCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {newKeyCopied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 cursor-pointer" onClick={() => setNewKey(null)}>
              I have saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {isCreating && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Generate API Key</CardTitle>
            <CardDescription>Configure name, expiration and access scopes for the new key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name <span className="text-destructive">*</span></Label>
              <Input
                id="key-name"
                placeholder="e.g. CI/CD Pipeline, Production Backend"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { v: "never", l: "Never" },
                  { v: "30d", l: "30 days" },
                  { v: "90d", l: "90 days" },
                  { v: "1y", l: "1 year" },
                  { v: "custom", l: "Custom" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setExpiryOption(opt.v)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${expiryOption === opt.v ? "border-primary bg-primary/10 text-primary font-medium" : "border-border/50 hover:bg-muted/40 text-muted-foreground"}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              {expiryOption === "custom" && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="max-w-xs mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Access Scopes</Label>
              <ScopeSelector
                selectedScopes={selectedScopes}
                onChange={setSelectedScopes}
                fullAccess={fullAccess}
                onFullAccessChange={v => { setFullAccess(v); if (v) setSelectedScopes([]) }}
              />
              {!fullAccess && selectedScopes.length === 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> Select at least one scope or enable Full Access.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending || (!fullAccess && selectedScopes.length === 0)}
                className="gap-2 min-w-[120px] cursor-pointer"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Generate
              </Button>
              <Button variant="ghost" onClick={() => { setIsCreating(false); createMutation.reset() }} disabled={createMutation.isPending} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys table */}
      <Card className="border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
          <span className="text-sm text-muted-foreground">
            {displayedKeys.length} key{displayedKeys.length !== 1 ? "s" : ""}
            {!showRevoked && keys.filter(k => k.status === "revoked").length > 0 && (
              <span className="ml-1">({keys.filter(k => k.status === "revoked").length} revoked hidden)</span>
            )}
          </span>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRevoked}
              onChange={e => setShowRevoked(e.target.checked)}
              className="cursor-pointer"
            />
            Show revoked
          </label>
        </div>
        <div className="rounded-xl overflow-hidden border-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 font-medium">Name</th>
                <th className="px-6 py-3.5 font-medium">Key</th>
                <th className="px-6 py-3.5 font-medium">Scopes</th>
                <th className="px-6 py-3.5 font-medium">Expires</th>
                <th className="px-6 py-3.5 font-medium">Last Used</th>
                <th className="px-6 py-3.5 font-medium">Activity</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
                <th className="px-6 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : displayedKeys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No API keys found. Generate one to get started.
                  </td>
                </tr>
              ) : (
                displayedKeys.map(key => {
                  const expiry = formatExpiry(key.expiresAt)
                  return (
                    <tr key={key.id} className={`hover:bg-muted/20 transition-colors ${key.status === "revoked" ? "opacity-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{key.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(key.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-[12px] text-muted-foreground">
                            {key.maskedKey}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[180px]">
                        <ScopeBadges scopes={key.scopes} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[13px] ${expiry.expired ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                          {expiry.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-[13px]">
                        {formatRelative(key.lastUsedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <ActivityBadge active={isRecentlyActive(key.lastUsedAt)} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={key.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {key.status !== "revoked" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setEditTarget(key)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setRevokeTarget(key)}
                                title="Revoke"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {revokeTarget && (
        <RevokeModal
          keyName={revokeTarget.name}
          onConfirm={handleRevoke}
          onCancel={() => { setRevokeTarget(null); deleteMutation.reset() }}
          loading={deleteMutation.isPending}
        />
      )}
      {editTarget && (
        <EditModal
          keyRecord={editTarget}
          onSave={handleEdit}
          onCancel={() => { setEditTarget(null); updateMutation.reset() }}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  )
}
