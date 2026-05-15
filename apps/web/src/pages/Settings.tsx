import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { PageHeader } from "../components/PageHeader";
import { TenantSubscriptionTab } from "../components/settings/TenantSubscriptionTab";
import { DeveloperDocsTab } from "../components/settings/DeveloperDocsTab";
import { ApiKeysManager } from "../components/ApiKeysManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ShieldAlert } from "lucide-react";

export function SettingsPage() {
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // We consider the user is superadmin globally
  const isSuperAdmin = session?.user?.email === "resper@bekaa.eu";

  useEffect(() => {
    if ((session?.session as any)?.activeOrganizationId) {
      fetchApiKeys();
    }
  }, [session]);

  const fetchApiKeys = async () => {
    const orgId = (session?.session as any)?.activeOrganizationId;
    if (!orgId) return;
    try {
      // Use standard fetch or apiClient to get keys
      const res = await fetch(`/api/v1/organizations/${orgId}/api-keys`, {
        headers: { "x-standard-tenant-id": orgId }
      });
      if (res.ok) {
        const json = await res.json();
        setApiKeys(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load API keys", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage subscription, API keys, and developer integrations" />

      {isSuperAdmin && (
        <div className="bg-yellow-950/40 border border-yellow-700 p-4 rounded-md flex items-center gap-3 mb-6">
          <ShieldAlert className="text-yellow-500 w-5 h-5" />
          <p className="text-sm text-yellow-500 font-medium tracking-wide">
            Bem-vindo, Resper (Superadmin). Observe que você está na visão isolada do Tenant. A visão global deve ser acessada no painel principal CyberGame.
          </p>
        </div>
      )}

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="bg-black border border-zinc-800 mb-2">
          <TabsTrigger value="subscription" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Assinatura</TabsTrigger>
          <TabsTrigger value="apikeys" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">B2B API Keys</TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-2">
            ⚙️ M2M Developer Hub
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscription" className="mt-0 border-none outline-none">
          <TenantSubscriptionTab />
        </TabsContent>

        <TabsContent value="apikeys" className="mt-0 border-none outline-none">
          <div className="p-1">
            <ApiKeysManager 
              apiKeys={apiKeys} 
              onKeysChanged={fetchApiKeys} 
              loading={loading} 
              setLoading={setLoading} 
            />
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-0 border-none outline-none">
          <DeveloperDocsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
