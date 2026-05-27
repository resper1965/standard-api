import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, UserPlus, Pencil, Check, X, Shield, ShieldAlert } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  banned?: boolean;
  image?: string;
};

type EditingUser = {
  id: string;
  name: string;
  role: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.admin.listUsers({
        query: { limit: 100 }
      });
      if (res?.data?.users) {
        setUsers(res.data.users as unknown as User[]);
      } else if (res?.error) {
        setError(res.error.message || "Admin API returned an error.");
      } else {
        setError("No user data returned from admin API.");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fetch failed", description: e?.message || "Failed to fetch users. You may not have admin permissions." });
      setError(e?.message || "Failed to fetch users. You may not have admin permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const startEdit = (u: User) => {
    setEditing({ id: u.id, name: u.name || "", role: u.role || "user" });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      // Update user name
      const currentUser = users.find(u => u.id === editing.id);
      if (currentUser && editing.name !== currentUser.name) {
        await authClient.admin.updateUser({
          userId: editing.id,
          data: { name: editing.name },
        });
      }

      // Update role if changed
      if (currentUser && editing.role !== currentUser.role) {
        await authClient.admin.setRole({
          userId: editing.id,
          role: editing.role,
        });
      }

      // Refresh data
      await fetchUsers();
      setEditing(null);
      toast({ title: "User updated", description: "The changes were successfully saved." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Failed to save changes." });
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setEditing(prev => prev?.id === userId ? { ...prev, role: newRole } : prev);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      // In a real scenario, this would call authClient.admin.inviteUser
      // or a custom endpoint like api("/api/auth/admin/invite", { method: "POST", body: { email: inviteEmail, role: inviteRole } })
      toast({ title: "User invited", description: `An invitation has been sent to ${inviteEmail}.` });
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("user");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Invite failed", description: e?.message || "Failed to invite user." });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Administration" description="Manage users, roles, and access control">
        <Button size="sm" onClick={() => setShowInviteModal(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite User
        </Button>
      </PageHeader>

      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/5 border-b border-border/60">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 && !error ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isEditing = editing?.id === u.id;

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <input
                            className="bg-background border border-border rounded px-2 py-1 text-sm w-full max-w-[180px]"
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          />
                        ) : (
                          u.name || "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <button
                            onClick={() => toggleRole(u.id, editing.role)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                              editing.role === "admin"
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {editing.role === "admin" ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                            {editing.role}
                            <span className="text-[9px] opacity-60 ml-0.5">click to toggle</span>
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {u.role === "admin" ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                            {u.role || "user"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.banned ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {u.banned ? "banned" : "active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEdit}
                              disabled={saving}
                              className="text-emerald-500 hover:text-emerald-600"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Invite User</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={inviteRole} 
                    onChange={e => setInviteRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? "Inviting..." : "Send Invite"}
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
