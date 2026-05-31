import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api";
import { useActiveOrg } from "../../hooks/useActiveOrg";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export function TenantSubscriptionTab() {
  const { orgId } = useActiveOrg();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // The active Organization in Standard Native Auth maps directly to the
    // Tenant in our unified SaaS schema.
    if (!orgId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");

    apiClient<TenantData>(`/api/v1/tenants/${orgId}`)
      .then((data) => { if (mounted) setTenant(data); })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load tenant info.");
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [orgId]);

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm py-4">
        Loading plan details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-muted-foreground text-sm py-4">
        No active tenant found.
      </div>
    );
  }

  const isActive = tenant.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Subscription &amp; Plan</h2>
        <p className="text-muted-foreground">
          View your SaaS subscription status and organization details.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Organization / Tenant</h3>
          <p className="text-2xl font-bold text-foreground">{tenant.name}</p>
          <p className="text-sm text-muted-foreground mt-2 font-mono">ID: {tenant.slug}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Plan Status</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-3 w-3 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
            <p className="text-2xl font-bold text-foreground uppercase">{tenant.status}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Pro Plan / Active B2B Integration</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Member Since</h3>
          <p className="text-2xl font-bold text-foreground">
            {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Platform join date</p>
        </div>
      </div>
    </div>
  );
}
