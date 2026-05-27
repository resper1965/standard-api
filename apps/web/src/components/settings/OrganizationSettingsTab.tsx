import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Save, Building2, CheckCircle2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface Organization {
  organization_id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
}

export function OrganizationSettingsTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { toast } = useToast();

  const activeOrgId = (session?.session as any)?.activeOrganizationId;

  const fetchOrg = async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const res = await api<Organization>(`/api/v1/organizations/${activeOrgId}`);
      if (res) {
        setOrg(res);
        setName(res.name);
        setSlug(res.slug);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: err.message || "Failed to load organization settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [activeOrgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setSaving(true);
    try {
      const res = await api(`/api/v1/organizations/${activeOrgId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, slug }),
      });
      if (res) {
        toast({
          title: "Organization updated",
          description: "Your changes have been saved successfully.",
        });
        fetchOrg();
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to update organization settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!org) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">No organization context found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 overflow-hidden">
      <CardHeader className="bg-muted/30 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Organization Profile</CardTitle>
              <CardDescription>Update your workspace identity and public details.</CardDescription>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 flex gap-1.5 items-center">
            <CheckCircle2 className="h-3 w-3" />
            <span className="uppercase tracking-widest font-bold text-[10px]">{org.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-xs font-bold uppercase tracking-widest opacity-60">Company Name</Label>
            <Input 
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50 border-border/50 h-11 focus:ring-primary/20 transition-all font-medium"
              placeholder="Standard GRC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug" className="text-xs font-bold uppercase tracking-widest opacity-60">Workspace Slug</Label>
            <div className="relative">
              <Input 
                id="org-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-muted/50 border-border/50 h-11 pl-4 focus:ring-primary/20 transition-all font-mono text-sm"
                placeholder="standard-grc"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded border border-border/50">
                .bekaa.eu
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">This is your internal identifier used for M2M URLs and API endpoints.</p>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="submit" disabled={saving} className="h-11 px-8 shadow-lg shadow-primary/20 font-bold tracking-tight">
              {saving ? "Saving Changes..." : "Save Configuration"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className="h-11">Discard Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
