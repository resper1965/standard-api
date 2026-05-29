import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import { authClient, useSession } from "../../lib/auth-client";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, Plus, CheckCircle2, Trash2, Pencil, LogOut } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, any>;
};

export function AdminOrganizations() {
  const { data: session } = useSession();
  const activeOrgId = (session?.session as any)?.activeOrganizationId ?? null;

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgSlug, setEditOrgSlug] = useState("");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<any>("/api/auth/organization/list", { method: "GET" });
      const dataArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setOrgs(dataArray);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch organizations";
      console.error("[AdminOrganizations] fetch error:", e);
      setError(msg);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleActivate = async (orgId: string) => {
    setActivating(orgId);
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      window.location.reload();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Activation Failed", description: e.message || "Could not activate organization" });
      setActivating(null);
    }
  };

  /**
   * Deactivate = set active org to null.
   * Better Auth doesn't have an explicit "deactivate" — we achieve it
   * by setting active org to null/empty and reloading.
   */
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      // setActive with null clears the active org in the session
      await authClient.organization.setActive({ organizationId: null as unknown as string });
      toast({ title: "Organization deactivated", description: "No organization is now active." });
      window.location.reload();
    } catch (e: any) {
      // Fallback: try empty string
      try {
        await (authClient.organization as any).setActive({ organizationId: "" });
        window.location.reload();
      } catch {
        toast({ variant: "destructive", title: "Deactivation Failed", description: e.message || "Could not deactivate organization" });
      }
    } finally {
      setDeactivating(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api("/api/auth/organization/create", {
        method: "POST",
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug })
      });
      setShowModal(false);
      setNewOrgName("");
      setNewOrgSlug("");
      await fetchOrgs();
      toast({ title: "Organization created", description: "The organization was successfully created." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: e.message || "An error occurred." });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!window.confirm(`Delete "${orgName}"? This action cannot be undone.`)) return;
    setDeleting(orgId);
    try {
      await authClient.organization.delete({ organizationId: orgId });
      await fetchOrgs();
      toast({ title: "Organization deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: e.message || "An error occurred." });
    } finally {
      setDeleting(null);
    }
  };

  const handleEditClick = (org: Organization) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgSlug(org.slug);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setUpdating(true);
    try {
      await authClient.organization.update({
        organizationId: editingOrg.id,
        data: { name: editOrgName, slug: editOrgSlug }
      });
      setEditingOrg(null);
      await fetchOrgs();
      toast({ title: "Organization updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message || "An error occurred." });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Organization
        </Button>
      </div>

      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          {error && <div className="p-4 text-sm text-destructive">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-10">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : orgs.map((o) => {
                  const isActive = activeOrgId === o.id;
                  return (
                    <TableRow key={o.id} className={isActive ? "bg-emerald-500/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {o.name}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{o.slug}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Activate — only shown for inactive orgs */}
                          {!isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(o.id)}
                              disabled={activating === o.id || !!deleting}
                            >
                              {activating === o.id ? (
                                <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Activating...</>
                              ) : "Activate"}
                            </Button>
                          )}

                          {/* Deactivate — only shown for the active org */}
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeactivate}
                              disabled={deactivating}
                              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                            >
                              {deactivating ? (
                                <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Deactivating...</>
                              ) : (
                                <><LogOut className="h-3 w-3 mr-1.5" />Deactivate</>
                              )}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(o)}
                            disabled={activating === o.id || !!deleting}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>

                          {/* Delete — shown for ALL orgs; active org must be deactivated first */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              if (isActive) {
                                toast({
                                  variant: "destructive",
                                  title: "Cannot delete active organization",
                                  description: "Deactivate this organization before deleting it."
                                });
                                return;
                              }
                              handleDelete(o.id, o.name);
                            }}
                            disabled={deleting === o.id || activating === o.id}
                          >
                            {deleting === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Create Organization</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="Acme Corporation" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input required value={newOrgSlug} onChange={e => setNewOrgSlug(e.target.value)} placeholder="acme-corp" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating...</> : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingOrg(null)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Edit Organization</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={editOrgName} onChange={e => setEditOrgName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input required value={editOrgSlug} onChange={e => setEditOrgSlug(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingOrg(null)}>Cancel</Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
