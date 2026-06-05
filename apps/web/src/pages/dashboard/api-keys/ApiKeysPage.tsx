import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState } from "react"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Key, Plus, Trash2, Loader2, Copy, Check, Pencil,
  ShieldCheck, ShieldOff, Clock
} from "lucide-react"
import { useOrgApiKeys, useCreateApiKey, useDeleteApiKey, useUpdateApiKey } from "@/lib/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyStatus = "active" | "expired" | "revoked"

type ApiKeyRecord = {
  id: string
  name: string
  masked_key: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  is_revoked: boolean
  status: KeyStatus
  created_at: string
}



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
function isRecentlyActive(last_used_at: string | null): boolean {
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
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium">
      <ShieldCheck className="h-3 w-3" /> Full Access
    </span>
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
  onSave: (patch: { name?: string; expiresAt?: string | null }) => void
  onCancel: () => void
  loading: boolean
}) {
  const [name, setName] = useState(keyRecord.name)
  const [expiryOption, setExpiryOption] = useState("never")
  const [customDate, setCustomDate] = useState("")

  const handleSave = () => {
    const patch: { name?: string; expiresAt?: string | null } = {}
    if (name !== keyRecord.name) patch.name = name
    const newExpiry = getExpiryDate(expiryOption, customDate) ?? null
    patch.expiresAt = newExpiry
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

          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-amber-500">Full Access</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">This key has access to all API endpoints.</p>
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
    createMutation.mutate(
      { name: newName, ...(expiresAt ? { expiresAt } : {}), scopes: [] },
      {
        onSuccess: (res) => {
          const rawKey = (res as any)?.data?.key ?? null
          setNewKey(rawKey)
          setNewName(""); setExpiryOption("never")
          setIsCreating(false)
        },
        onError: (err) => {
          console.error("[ApiKeysPage] Create API key failed:", err)
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

  const handleEdit = (patch: { name?: string; expiresAt?: string | null }) => {
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

            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-amber-500">Full Access</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">This key will have access to all API endpoints.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
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
                  const expiry = formatExpiry(key.expires_at)
                  return (
                    <tr key={key.id} className={`hover:bg-muted/20 transition-colors ${key.status === "revoked" ? "opacity-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{key.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(key.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-[12px] text-muted-foreground">
                            {key.masked_key}
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
                        {formatRelative(key.last_used_at)}
                      </td>
                      <td className="px-6 py-4">
                        <ActivityBadge active={isRecentlyActive(key.last_used_at)} />
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

