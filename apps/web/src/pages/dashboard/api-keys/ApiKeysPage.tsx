import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState } from "react"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/PageHeader"
import { SecretDisplayOverlay } from "@/components/api-keys/SecretDisplayOverlay"
import { useSecretDisplay } from "@/stores/secretDisplay.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Key, Plus, Trash2, Loader2, Copy, Check, Pencil,
  ShieldCheck, ShieldOff, Clock, AlertCircle, Eye, EyeOff
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
  if (!last_used_at) return false
  const diff = Date.now() - new Date(last_used_at).getTime()
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
    <span className="ds-badge ds-badge--active inline-flex items-center gap-1">
      <ShieldCheck className="h-3 w-3" /> Active
    </span>
  )
  if (status === "expired") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Clock className="h-3 w-3" /> Expired
    </span>
  )
  return (
    <span className="ds-badge ds-badge--muted inline-flex items-center gap-1">
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

// ─── Key Secret with blur-reveal spell ────────────────────────────────────────

function MaskedKey({ maskedKey }: { maskedKey: string }) {
  const [showKey, setShowKey] = useState(false)
  return (
    <div className="flex items-center gap-1">
      <code className="rounded bg-muted px-2 py-1 font-mono text-[12px] text-muted-foreground">
        <span className={`ds-secret ${showKey ? "ds-secret--visible" : "ds-secret--hidden"}`}>
          {maskedKey}
        </span>
      </code>
      <button
        type="button"
        onClick={() => setShowKey(v => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title={showKey ? "Hide key" : "Reveal key"}
      >
        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}



// ─── Modals ───────────────────────────────────────────────────────────────────

function RevokeModal({ keyName, open, onConfirm, onCancel, loading }: {
  keyName: string
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Revoke API Key</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                You are about to revoke <strong className="text-foreground">"{keyName}"</strong>.
              </p>
              <p className="text-sm text-destructive font-medium">
                This action cannot be undone. Any integrations using this key will immediately lose access.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Revoke Key
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1 cursor-pointer">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditModal({ keyRecord, open, onSave, onCancel, loading }: {
  keyRecord: ApiKeyRecord
  open: boolean
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-row items-center gap-3 p-6 pb-4 border-b border-border/50 shrink-0 space-y-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Pencil className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Edit API Key</DialogTitle>
        </DialogHeader>

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

        <DialogFooter className="gap-3 sm:gap-3 p-6 pt-4 border-t border-border/50 shrink-0">
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1 cursor-pointer">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { set: setToken, clear: clearToken, token: newKey } = useSecretDisplay()
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
      { name: newName, ...(expiresAt ? { expiresAt } : {}), scopes: ["assessment:read", "assessment:write", "documents:read", "documents:write", "scf:read"] },
      {
        onSuccess: (res) => {
          const rawKey = (res as any)?.data?.key ?? null
          if (rawKey) setToken(rawKey)  // G13: stored in Zustand, destroyed on clear()
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
      <PageHeader
        title="API Keys"
        description="Machine-to-machine bearer tokens for authenticating API requests"
      />

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

      {/* One-time key display — G13 SecretDisplayOverlay */}
      {newKey && (
        <Card className="border-amber-500/30 shadow-md bg-amber-950/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader>
            <CardTitle className="text-lg">Chave Gerada com Sucesso</CardTitle>
            <CardDescription className="text-foreground/80 font-medium">
              Guarda a chave agora — não poderás vê-la novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SecretDisplayOverlay />
            <Button
              id="btn-key-dismiss"
              variant="outline"
              className="w-full"
              onClick={() => clearToken()}
            >
              Já guardei a minha chave
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
          <Table>
            <TableHeader className="bg-muted/40 text-muted-foreground border-b border-border/50">
              <TableRow>
                <TableHead className="px-6 py-3.5 font-medium">Name</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Key</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Scopes</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Expires</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Last Used</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Activity</TableHead>
                <TableHead className="px-6 py-3.5 font-medium">Status</TableHead>
                <TableHead className="px-6 py-3.5 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : displayedKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No API keys found. Generate one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                displayedKeys.map(key => {
                  const expiry = formatExpiry(key.expires_at)
                  return (
                    <TableRow key={key.id} className={`hover:bg-muted/20 transition-colors ${key.status === "revoked" ? "opacity-50" : ""}`}>
                      <TableCell className="px-6 py-4">
                        <div className="font-medium text-foreground">{key.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(key.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <MaskedKey maskedKey={key.masked_key} />
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-[180px]">
                        <ScopeBadges scopes={key.scopes} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`text-[13px] ${expiry.expired ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                          {expiry.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground text-[13px]">
                        {formatRelative(key.last_used_at)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <ActivityBadge active={isRecentlyActive(key.last_used_at)} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={key.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
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
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      <RevokeModal
        open={revokeTarget !== null}
        keyName={revokeTarget?.name ?? ""}
        onConfirm={handleRevoke}
        onCancel={() => { setRevokeTarget(null); deleteMutation.reset() }}
        loading={deleteMutation.isPending}
      />
      {editTarget && (
        <EditModal
          open={editTarget !== null}
          keyRecord={editTarget}
          onSave={handleEdit}
          onCancel={() => { setEditTarget(null); updateMutation.reset() }}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  )
}

