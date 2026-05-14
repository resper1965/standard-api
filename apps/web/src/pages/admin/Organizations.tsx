import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, Plus } from "lucide-react";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, any>;
};

export function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api<any>("/api/auth/organization/list", { method: "GET" }).catch(() => [
        { id: "org_default", name: "Default Org", slug: "default", createdAt: new Date() }
      ]);
      const dataArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setOrgs(dataArray);
    } catch (e: any) {
      setError(e.message || "Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

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
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Manage tenant organizations and access">
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Organization
        </Button>
      </PageHeader>

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
                {orgs.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                    {creating ? "Creating..." : "Create"}
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
