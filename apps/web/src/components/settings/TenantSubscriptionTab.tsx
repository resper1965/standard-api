import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/api";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export function TenantSubscriptionTab() {
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenant() {
      // The active Organization in Better Auth maps directly to the Tenant in our unified SaaS schema
      const orgId = (session?.session as any)?.activeOrganizationId;
      if (!orgId) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await apiClient(`/api/v1/tenants/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
        }
      } catch (err) {
        console.error("Failed to fetch tenant info", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTenant();
  }, [session]);

  if (loading) return <div className="text-zinc-500">Loading plan details...</div>;
  if (!tenant) return <div className="text-zinc-500">No active tenant found.</div>;

  const isActive = tenant.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Subscription & Plan</h2>
        <p className="text-muted-foreground">
          View your SaaS subscription status and organization details.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-black p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Organization / Tenant</h3>
          <p className="text-2xl font-bold text-white">{tenant.name}</p>
          <p className="text-sm text-zinc-500 mt-2 font-mono">ID: {tenant.slug}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Status do Plano</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <p className="text-2xl font-bold text-white uppercase">{tenant.status}</p>
          </div>
          <p className="text-sm text-zinc-500 mt-2">Plano Pro / Integração B2B Ativa</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Membro Desde</h3>
          <p className="text-2xl font-bold text-white">
            {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-zinc-500 mt-2">Data de entrada na plataforma</p>
        </div>
      </div>
    </div>
  );
}
