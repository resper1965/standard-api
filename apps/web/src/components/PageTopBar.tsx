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
    <header className="page-topbar sticky top-0 z-30 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 transition-all duration-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="page-topbar-left flex items-center">
          <h1 className="text-2xl font-brand font-bold tracking-tight text-foreground">{title}</h1>
        </div>

        <div className="page-topbar-right flex items-center gap-5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="h-9 w-64 rounded-full bg-white/5 border border-white/10 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all group-hover:bg-white/10" 
            />
          </div>
          
          {/* Organization Selector */}
          <div className="w-[200px]">
            <Select value={activeOrgId} onValueChange={handleOrgChange}>
              <SelectTrigger className="h-9 rounded-full bg-white/5 border-white/10 hover:bg-white/10 transition-colors focus:ring-primary/50">
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Building2 className="h-4 w-4 opacity-70" />
                  <SelectValue placeholder={loading ? "Loading..." : "Select Organization"} />
                </div>
              </SelectTrigger>
              <SelectContent className="glass-dark border-white/10">
                {orgs.map(org => (
                  <SelectItem key={org.id} value={org.id} className="cursor-pointer focus:bg-primary/20 focus:text-primary">
                    {org.name}
                  </SelectItem>
                ))}
                {orgs.length === 0 && !loading && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No organizations</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <button className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group hover-lift" aria-label="Notifications">
            <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground bell-spell" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
