// SettingsAccount.tsx — Tenant Identity section (general tab, personal/account info)
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Copy } from "lucide-react"
import { API_URL } from "@/lib/config"

interface SettingsAccountProps {
  activeOrgId: string | undefined
  copiedId: string
  onCopy: (text: string, id: string) => void
}

export function SettingsAccount({ activeOrgId, copiedId, onCopy }: SettingsAccountProps) {
  const renderCopyBtn = (text: string, id: string) => (
    <Button variant="outline" size="icon" onClick={() => onCopy(text, id)} className="shrink-0">
      {copiedId === id ? <Check className="w-4 h-4" style={{ color: "var(--ds-success)" }} /> : <Copy className="w-4 h-4" />}
    </Button>
  )

  return (
    <Card className="border-border bg-card/60">
      <CardHeader>
        <CardTitle>Tenant Identity</CardTitle>
        <CardDescription>Primary identifiers for API consumption. The Tenant ID is required on every request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Tenant ID</Label>
          <div className="flex max-w-md items-center space-x-2">
            <Input readOnly value={activeOrgId || "..."} className="font-mono bg-muted/50 text-sm" />
            {renderCopyBtn(activeOrgId || "", "tid")}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>API Base URL</Label>
          <div className="flex max-w-lg items-center space-x-2">
            <Input readOnly value={`${API_URL}/api/v1`} className="font-mono bg-muted/50 text-sm" />
            {renderCopyBtn(`${API_URL}/api/v1`, "baseurl")}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
