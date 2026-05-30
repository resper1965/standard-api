import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Plus, Trash2, Eye, EyeOff, Loader2, Copy, Check } from "lucide-react"

type ApiKeyRecord = {
  id: string
  name: string
  maskedKey: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  isRevoked?: boolean
}

export function ApiKeysPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const orgId = (session?.session as any)?.activeOrganizationId

  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadKeys = async () => {
    if (!userId || !orgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api<any>(`/api/v1/organizations/${orgId}/api-keys`, { method: "GET" })
      setKeys(res?.data || [])
    } catch (e: any) {
      setError(e.message || "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [userId, orgId])

  const handleCreate = async () => {
    if (!newName.trim() || !userId || !orgId) return
    setCreating(true)
    setError(null)
    setNewKey(null)
    try {
      const res = await api<any>(`/api/v1/organizations/${orgId}/api-keys`, {
        method: "POST",
        body: JSON.stringify({ name: newName }),
      })
      setNewKey(res?.data?.key)
      setNewName("")
      setIsCreating(false)
      loadKeys()
    } catch (e: any) {
      setError(e.message || "Failed to create API key")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!userId || !orgId) return
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return
    try {
      await api(`/api/v1/organizations/${orgId}/api-keys/${keyId}`, { method: "DELETE" })
      loadKeys()
    } catch (e: any) {
      setError("Failed to revoke: " + e.message)
    }
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!userId) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/50">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for programmatic access to the Standard API.
          </p>
        </div>
        {!isCreating && !newKey && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-sm shadow-primary/20 cursor-pointer">
            <Plus className="h-4 w-4" />
            Generate New Key
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {newKey && (
        <Card className="border-primary/50 shadow-md shadow-primary/10 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader>
            <CardTitle className="text-lg">Key Generated Successfully</CardTitle>
            <CardDescription className="text-foreground/80 font-medium">
              Please copy your API key now. You will not be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <code className="flex-1 rounded-md bg-background px-4 py-3 font-mono text-sm border border-border/60 break-all select-all shadow-inner text-primary font-semibold">
                {newKey}
              </code>
              <Button onClick={handleCopy} variant="secondary" className="gap-2 shrink-0 h-[46px] cursor-pointer">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button variant="outline" className="w-full mt-2 border-primary/20 hover:bg-primary/10 cursor-pointer" onClick={() => setNewKey(null)}>
              I have saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {isCreating && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Generate API Key</CardTitle>
            <CardDescription>Create a new API key scoped to your current organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. CI/CD Pipeline, Production Backend"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="max-w-md"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-2 min-w-[120px] cursor-pointer">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Generate
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)} disabled={creating} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm">
        <div className="rounded-xl overflow-hidden border-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 font-medium">Name</th>
                <th className="px-6 py-3.5 font-medium">Key Prefix</th>
                <th className="px-6 py-3.5 font-medium">Created</th>
                <th className="px-6 py-3.5 font-medium">Last Used</th>
                <th className="px-6 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No API keys found. Create one to get started.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className={`hover:bg-muted/20 transition-colors ${key.isRevoked ? "opacity-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {key.name}
                        {key.isRevoked && <span className="text-[10px] uppercase font-bold tracking-wider bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Revoked</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="rounded bg-muted px-2 py-1 font-mono-premium text-[13px] text-muted-foreground">
                        {key.maskedKey}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-[13px]">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-[13px]">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!key.isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 cursor-pointer"
                          onClick={() => handleRevoke(key.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
