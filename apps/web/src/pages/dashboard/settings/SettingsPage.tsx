import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useEffect } from "react"
import { useOrgDetail, useOrgApiKeys, qk } from "@/lib/queries"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Building, Key, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { PageHeader } from "@/components/ui/PageHeader"

import { SettingsAccount } from "./SettingsAccount"
import { SettingsOrg } from "./SettingsOrg"
import { SettingsSecurityKeys, SettingsSecurityDocs } from "./SettingsSecurity"

// --- Local Types ---
interface OrgSummary {
  id: string
  name: string
  slug: string
  billing_tier: string
  status?: string
}
interface ApiKeySummary {
  id: string
  name: string
  maskedKey?: string
  scopes: string[]
  createdAt: string
  expiresAt?: string | null
  revokedAt?: string | null
  isRevoked?: boolean
  status?: "active" | "expired" | "revoked"
}

const AVAILABLE_SCOPES = [
  "assessment:read", "assessment:write", "assessment:transition",
  "document:read", "document:write", "document:delete",
  "scf:read", "soa:read", "soa:write", "gap:read", "gap:write",
  "poam:read", "poam:write", "report:read", "report:write", "report:export",
  "kb:read", "kb:search", "agent:read", "agent:run", "integration:analyze",
  "audit:read", "metrics:read", "usage:read", "workflow:read", "workflow:write",
  "workflow:signal", "artifact:read", "artifact:write", "approval:read"
]

// --- Component ---
export function SettingsPage() {
  useDocumentTitle("Settings");
  const { orgId } = useActiveOrg()
  const { toast } = useToast()
  // hasActiveOrg uses the resolved Standard UUID (not BA nanoid) from useActiveOrg
  const hasActiveOrg = !!orgId

  const qc = useQueryClient()
  const { data: orgDetail } = useOrgDetail(orgId ?? undefined)
  const { data: apiKeysData } = useOrgApiKeys(orgId ?? undefined)

  const activeOrg = orgDetail as OrgSummary | null | undefined
  const apiKeys = (apiKeysData?.data ?? []) as ApiKeySummary[]

  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Assessments")
  const [keyName, setKeyName] = useState("External System Key")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeySummary | null>(null)
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)

  // Org settings and faturamento states
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [billingTier, setBillingTier] = useState("free")
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false)
  const [isUpdatingBilling, setIsUpdatingBilling] = useState(false)



  useEffect(() => {
    if (activeOrg) {
      setOrgName(activeOrg.name || "")
      setOrgSlug(activeOrg.slug || "")
      setBillingTier(activeOrg.billing_tier || "free")
    }
  }, [activeOrg])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(""), 2000)
  }

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrg?.id) return
    setIsUpdatingOrg(true)
    try {
      await api<Record<string, unknown>>(`/api/v1/organizations/${activeOrg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: orgName, slug: orgSlug })
      })
      toast({ title: "Organization updated", description: "Your organization settings have been updated successfully." })
      if (orgId) qc.invalidateQueries({ queryKey: qk.orgDetail(orgId) })
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Failed to update organization details." })
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  const handleUpdateBilling = async () => {
    if (!activeOrg?.id) return
    setIsUpdatingBilling(true)
    try {
      await api<Record<string, unknown>>(`/api/v1/organizations/${activeOrg.id}/billing`, {
        method: "PATCH",
        body: JSON.stringify({ billing_tier: billingTier })
      })
      toast({ title: "Plan updated", description: `Organization billing plan updated to ${billingTier.toUpperCase()} successfully.` })
      if (orgId) qc.invalidateQueries({ queryKey: qk.orgDetail(orgId) })
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Failed to update billing tier." })
    } finally {
      setIsUpdatingBilling(false)
    }
  }

  const handleGenerateKey = async () => {
    if (!activeOrg?.id) return
    setIsGenerating(true)
    try {
      const json = await api<{ data: { key: string } }>(`/api/v1/organizations/${activeOrg.id}/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          name: keyName,
          scopes: selectedScopes.length > 0 ? selectedScopes : undefined
        })
      })
      setNewKey(json.data.key)
      setSelectedScopes([])
      qc.invalidateQueries({ queryKey: qk.orgApiKeys(activeOrg.id) })
    } catch (e) {
      toast({ title: "Generation failed", description: e instanceof Error ? e.message : "Failed to generate key." })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async () => {
    if (!activeOrg?.id || !keyToRevoke) return
    setIsRevoking(keyToRevoke.id)
    try {
      await api(`/api/v1/organizations/${activeOrg.id}/api-keys/${keyToRevoke.id}`, { method: "DELETE" })
      toast({ title: "API Key revoked", description: `The key "${keyToRevoke.name}" has been permanently revoked.` })
      setIsRevokeDialogOpen(false)
      setKeyToRevoke(null)
      qc.invalidateQueries({ queryKey: qk.orgApiKeys(activeOrg.id) })
    } catch (e) {
      toast({ variant: "destructive", title: "Revocation failed", description: e instanceof Error ? e.message : "Failed to revoke key." })
    } finally {
      setIsRevoking(null)
    }
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  if (!hasActiveOrg) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center space-y-4">
        <Building className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-medium">No Organization Active</h2>
        <p className="text-muted-foreground">Select or create an organization to manage settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, organization and API access" />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-muted/50">
          <TabsTrigger value="general"><Building className="w-4 h-4 mr-2" />General</TabsTrigger>

          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-2" />API Keys</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="w-4 h-4 mr-2" />API Reference</TabsTrigger>
        </TabsList>

        {/* ─── General ─── */}
        <TabsContent value="general" className="space-y-4">
          <SettingsAccount
            activeOrgId={activeOrg?.id}
            copiedId={copiedId}
            onCopy={copy}
          />
          <SettingsOrg
            orgName={orgName}
            setOrgName={setOrgName}
            orgSlug={orgSlug}
            setOrgSlug={setOrgSlug}
            isUpdatingOrg={isUpdatingOrg}
            handleUpdateOrg={handleUpdateOrg}
            billingTier={billingTier}
            setBillingTier={setBillingTier}
            isUpdatingBilling={isUpdatingBilling}
            handleUpdateBilling={handleUpdateBilling}
          />
        </TabsContent>


        {/* ─── API Keys ─── */}
        <TabsContent value="keys" className="space-y-4">
          <SettingsSecurityKeys
            activeOrgId={activeOrg?.id}
            apiKeys={apiKeys}
            copiedId={copiedId}
            onCopy={copy}
            keyName={keyName}
            setKeyName={setKeyName}
            selectedScopes={selectedScopes}
            toggleScope={toggleScope}
            isGenerating={isGenerating}
            handleGenerateKey={handleGenerateKey}
            newKey={newKey}
            isRevoking={isRevoking}
            keyToRevoke={keyToRevoke}
            setKeyToRevoke={setKeyToRevoke}
            isRevokeDialogOpen={isRevokeDialogOpen}
            setIsRevokeDialogOpen={setIsRevokeDialogOpen}
            handleRevokeKey={handleRevokeKey}
          />
        </TabsContent>

        {/* ─── API Reference ─── */}
        <TabsContent value="docs" className="space-y-4">
          <SettingsSecurityDocs
            activeOrgId={activeOrg?.id}
            copiedId={copiedId}
            onCopy={copy}
            expandedGroup={expandedGroup}
            setExpandedGroup={setExpandedGroup}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
