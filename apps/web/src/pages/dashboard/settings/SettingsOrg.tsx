// SettingsOrg.tsx — Organization Settings + Billing & Subscription (general tab)
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface SettingsOrgProps {
  // Org Settings
  orgName: string
  setOrgName: (v: string) => void
  orgSlug: string
  setOrgSlug: (v: string) => void
  isUpdatingOrg: boolean
  handleUpdateOrg: (e: React.FormEvent) => void

  // Billing
  billingTier: string
  setBillingTier: (v: string) => void
  isUpdatingBilling: boolean
  handleUpdateBilling: () => void
}

export function SettingsOrg({
  orgName,
  setOrgName,
  orgSlug,
  setOrgSlug,
  isUpdatingOrg,
  handleUpdateOrg,
  billingTier,
  setBillingTier,
  isUpdatingBilling,
  handleUpdateBilling,
}: SettingsOrgProps) {
  return (
    <>
      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Update your organization's display name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization Name"
              />
            </div>
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="orgSlug">Organization Slug (URL path)</Label>
              <Input
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="organization-slug"
              />
            </div>
            <Button type="submit" disabled={isUpdatingOrg} className="bg-primary/80">
              {isUpdatingOrg ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle>Billing &amp; Subscription</CardTitle>
          <CardDescription>Manage subscription tier for your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="billingTier">Active Plan</Label>
            <select
              id="billingTier"
              value={billingTier}
              onChange={(e) => setBillingTier(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="free">Free - SCF &amp; Local Assessments</option>
              <option value="pro">Pro - Unlimited Assessments &amp; Integrations</option>
              <option value="enterprise">Enterprise - Dedicated Workspace &amp; Support</option>
            </select>
          </div>
          <Button onClick={handleUpdateBilling} disabled={isUpdatingBilling} className="bg-primary/80">
            {isUpdatingBilling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Plan...
              </>
            ) : (
              "Update Plan"
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
