import { useSession, authClient } from "../lib/auth-client";
import { Bell, Search, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type PageTopBarProps = {
  title: string;
};

export function PageTopBar({ title }: PageTopBarProps) {
  const { data: session } = useSession();
  const activeOrgId = (session?.session as any)?.activeOrganizationId ?? null;
  
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    setLoading(true);
    api<any>("/api/auth/organization/list", { method: "GET" })
      .then(res => {
        if (!mounted) return;
        const dataArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setOrgs(dataArray);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [session]);

  const handleOrgChange = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      window.location.reload();
    } catch (e) {
      console.error("Failed to activate organization", e);
    }
  };

  return (
    <header className="page-topbar glass sticky top-0 z-10 border-b border-white/5 backdrop-blur-md">
      <div className="page-topbar-left">
        <h1 className="text-xl font-brand font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="page-topbar-right flex items-center gap-4">
        <div className="topbar-search-compact">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search..." className="topbar-search-input" />
        </div>
        
        {/* Organization Selector */}
        <div className="w-[200px]">
          <Select value={activeOrgId} onValueChange={handleOrgChange}>
            <SelectTrigger className="h-9 bg-transparent border-white/10 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="h-4 w-4 opacity-70" />
                <SelectValue placeholder={loading ? "Loading..." : "Select Organization"} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {orgs.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
              {orgs.length === 0 && !loading && (
                <div className="px-2 py-2 text-sm text-muted-foreground">No organizations</div>
              )}
            </SelectContent>
          </Select>
        </div>

        <button className="topbar-icon-btn" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="topbar-badge">3</span>
        </button>
      </div>
    </header>
  );
}
