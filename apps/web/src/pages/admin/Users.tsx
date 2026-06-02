import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useMemo, useEffect } from "react";
import { api } from "../../lib/api";
import { useAdminUsers, useAdminOrgs, usePendingUserCount, qk } from "../../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../components/ui/select";
import {
  Loader2, UserPlus, Pencil, ShieldAlert, Shield, Ban, Trash2, UserCheck,
  Search, AlertTriangle, Users, RefreshCw, ShieldOff, Eye, EyeOff, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  banned?: boolean;
  approved?: boolean;
  image?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak", color: "bg-destructive" },
    1: { label: "Weak", color: "bg-destructive" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Good", color: "bg-emerald-500" },
    4: { label: "Strong", color: "bg-emerald-500" },
  };
  return { score, ...labels[score] };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ name, banned }: { name?: string; banned?: boolean }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
        banned
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      }`}
    >
      {getInitials(name)}
    </div>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[260px]">User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

export function AdminUsers() {
  useDocumentTitle("Users");
  const qc = useQueryClient();

  // ---- Search + pagination --------------------------------------------------
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching, error, refetch } = useAdminUsers(page, search);
  const { data: pendingData } = usePendingUserCount();
  const pendingCount = pendingData?.data?.count ?? 0;

  const users = (data?.data ?? []) as User[];
  const hasMore = users.length > PAGE_SIZE;
  const visibleUsers = users.slice(0, PAGE_SIZE);

  const forbidden = (error as { status?: number } | null)?.status === 403
    || (error instanceof Error && (
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("forbidden") ||
      error.message.toLowerCase().includes("permission")
    ));

  // Client-side search filter (server search is also active, this is belt-and-suspenders)
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return visibleUsers;
    const q = search.toLowerCase();
    return visibleUsers.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [visibleUsers, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.adminUsers(page, search) });
    qc.invalidateQueries({ queryKey: qk.pendingUserCount() });
  };

  // ---- Create modal --------------------------------------------------------
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---- Edit modal ----------------------------------------------------------
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [saving, setSaving] = useState(false);

  // ---- Confirm dialog ------------------------------------------------------
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "unban" | "delete" | "approve" | "reject";
    user: User;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [approveOrgId, setApproveOrgId] = useState("");

  // Fetch orgs for the approval org-selector
  const { data: orgsData } = useAdminOrgs(0, "");
  const allOrgs = (orgsData?.data ?? []) as { id: string; name: string; slug: string }[];

  const { toast } = useToast();

  const resetCreateForm = () => {
    setCreateName(""); setCreateEmail(""); setCreatePassword("");
    setCreateRole("user"); setShowPassword(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api<{ data: User }>("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: createName, email: createEmail, password: createPassword, role: createRole }),
      });
      if (res?.data) {
        toast({ title: "User created", description: `${createEmail} was added successfully.` });
        setShowCreate(false);
        resetCreateForm();
        invalidate();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Creation failed", description: e instanceof Error ? e.message : "Failed to create user." });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u); setEditName(u.name || ""); setEditRole(u.role || "user");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api(`/api/v1/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(editName !== editUser.name ? { name: editName } : {}),
          ...(editRole !== editUser.role ? { role: editRole } : {}),
        }),
      });
      toast({ title: "User updated", description: "Changes saved successfully." });
      setEditUser(null);
      invalidate();
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed", description: e instanceof Error ? e.message : "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setConfirmLoading(true);
    try {
      if (type === "ban") {
        await api(`/api/v1/admin/users/${user.id}/ban`, { method: "POST", body: JSON.stringify({ reason: banReason || "Banned by admin" }) });
        toast({ title: "User banned", description: `${user.email} has been banned.` });
      } else if (type === "unban") {
        await api(`/api/v1/admin/users/${user.id}/unban`, { method: "POST" });
        toast({ title: "User unbanned", description: `${user.email} can now log in.` });
      } else if (type === "delete") {
        await api(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
        toast({ title: "User deleted", description: `${user.email} was permanently removed.` });
      } else if (type === "approve") {
        if (!approveOrgId) {
          toast({ variant: "destructive", title: "Organization required", description: "Select an organization to assign the user to." });
          setConfirmLoading(false);
          return;
        }
        await api(`/api/v1/admin/users/${user.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ organization_id: approveOrgId }),
        });
        toast({ title: "User approved", description: `${user.email} was approved and assigned to an organization.` });
      } else if (type === "reject") {
        await api(`/api/v1/admin/users/${user.id}/reject`, { method: "POST" });
        toast({ title: "User rejected", description: `${user.email} registration was rejected and removed.` });
      }
      setConfirmAction(null);
      setBanReason("");
      setApproveOrgId("");
      invalidate();
    } catch (e) {
      toast({ variant: "destructive", title: `${type.charAt(0).toUpperCase() + type.slice(1)} failed`, description: e instanceof Error ? e.message : `Failed to ${type} user.` });
    } finally {
      setConfirmLoading(false);
    }
  };

  const loading = isLoading || isFetching;

  // Client-side filter for pending-only mode
  const displayUsers = showPendingOnly
    ? filteredUsers.filter((u) => u.approved === false)
    : filteredUsers;

  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-border/60 shadow-none max-w-md w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldOff className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">Insufficient Permissions</h3>
              <p className="text-sm text-muted-foreground max-w-[320px]">
                You don't have admin privileges to view user management. Contact your administrator for access.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              variant={showPendingOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPendingOnly((v) => !v)}
              className="cursor-pointer gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Pending
              <Badge variant="destructive" className="ml-0.5 text-[10px] px-1.5 py-0">{pendingCount}</Badge>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={loading} className="cursor-pointer">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="cursor-pointer">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create User
          </Button>
        </div>
      </div>

      {/* Main table card */}
      <Card className="border-border/60 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {/* Error banner */}
          {error && !forbidden && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm bg-destructive/5 border-b border-border/60">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-destructive flex-1">{(error as Error).message ?? "Failed to fetch users."}</span>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="cursor-pointer shrink-0">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={6} />
          ) : displayUsers.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {search ? "No users match your search" : "No users found"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {search ? "Try adjusting your search query." : "Create your first user to get started."}
                </p>
              </div>
              {search && (
                <Button variant="outline" size="sm" onClick={() => setSearch("")} className="cursor-pointer">
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow
                    key={u.id}
                    className={`transition-colors duration-150 ${
                      u.banned ? "opacity-60" : u.approved === false ? "bg-amber-500/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} banned={u.banned} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "muted"} className="gap-1">
                        {u.role === "admin" ? <ShieldAlert className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {u.role || "user"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.approved === false ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      ) : u.banned ? (
                        <Badge variant="destructive">
                          Banned
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" title={u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}>
                        {u.createdAt ? relativeTime(u.createdAt) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {u.approved === false ? (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmAction({ type: "approve", user: u })}
                              className="h-8 w-8 p-0 cursor-pointer text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                              title="Approve user"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmAction({ type: "reject", user: u })}
                              className="h-8 w-8 p-0 cursor-pointer text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              title="Reject registration"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="h-8 w-8 p-0 cursor-pointer" title="Edit user">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmAction({ type: u.banned ? "unban" : "ban", user: u })}
                              className={`h-8 w-8 p-0 cursor-pointer ${u.banned ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"}`}
                              title={u.banned ? "Unban user" : "Ban user"}
                            >
                              {u.banned ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmAction({ type: "delete", user: u })}
                              className="h-8 w-8 p-0 cursor-pointer text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination footer */}
          {!loading && !error && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 text-xs text-muted-foreground">
              <span>
                {search
                  ? `${filteredUsers.length} shown`
                  : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} · Page ${page + 1}`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0 || loading} className="h-7 px-2 cursor-pointer">← Prev</Button>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading} className="h-7 px-2 cursor-pointer">Next →</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetCreateForm(); setShowCreate(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user to the platform.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input id="create-name" required value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address</Label>
              <Input id="create-email" type="email" required value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="jane@acme.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <div className="relative">
                <Input id="create-password" type={showPassword ? "text" : "password"} required minLength={8} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min. 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={createPassword} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createRole} onValueChange={setCreateRole}>
                <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user"><span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-muted-foreground" />User</span></SelectItem>
                  <SelectItem value="admin"><span className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-primary" />Admin</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { resetCreateForm(); setShowCreate(false); }} className="cursor-pointer">Cancel</Button>
              <Button type="submit" disabled={creating} className="cursor-pointer">
                {creating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating…</> : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editUser?.email ? <span className="font-mono text-xs">{editUser.email}</span> : "Update user details."}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                <UserAvatar name={editName || editUser.name} banned={editUser.banned} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{editName || editUser.name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{editUser.email}</p>
                </div>
                {editUser.banned && <Badge variant="destructive" className="ml-auto shrink-0">Banned</Badge>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user"><span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-muted-foreground" />User</span></SelectItem>
                    <SelectItem value="admin"><span className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-primary" />Admin</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted/20 border border-border/40 p-3 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">User ID</p>
                <p className="font-mono text-xs text-muted-foreground break-all select-all">{editUser.id}</p>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setEditUser(null)} className="cursor-pointer">Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="cursor-pointer">
                  {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog (Ban / Unban / Delete) */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "delete" && <Trash2 className="h-5 w-5 text-destructive" />}
              {confirmAction?.type === "ban" && <Ban className="h-5 w-5 text-amber-500" />}
              {confirmAction?.type === "unban" && <UserCheck className="h-5 w-5 text-emerald-500" />}
              {confirmAction?.type === "approve" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {confirmAction?.type === "reject" && <XCircle className="h-5 w-5 text-destructive" />}
              {confirmAction?.type === "delete" ? "Delete User" : confirmAction?.type === "ban" ? "Ban User" : confirmAction?.type === "unban" ? "Unban User" : confirmAction?.type === "approve" ? "Approve User" : "Reject Registration"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "delete" && <>This will permanently delete <span className="font-medium text-foreground">{confirmAction.user.email}</span>. This action cannot be undone.</>}
              {confirmAction?.type === "ban" && <><span className="font-medium text-foreground">{confirmAction.user.email}</span> will be banned and unable to log in.</>}
              {confirmAction?.type === "unban" && <><span className="font-medium text-foreground">{confirmAction.user.email}</span> will be unbanned and able to log in again.</>}
              {confirmAction?.type === "approve" && <>Select an organization for <span className="font-medium text-foreground">{confirmAction.user.email}</span> and approve their access.</>}
              {confirmAction?.type === "reject" && <>The registration for <span className="font-medium text-foreground">{confirmAction.user.email}</span> will be rejected and the account permanently removed.</>}
            </DialogDescription>
          </DialogHeader>
          {confirmAction?.type === "ban" && (
            <div className="space-y-1.5">
              <Label htmlFor="ban-reason" className="text-xs">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea id="ban-reason" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Violated terms of service" rows={2} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}
          {confirmAction?.type === "approve" && (
            <div className="space-y-2">
              <Label className="text-xs">Assign to Organization <span className="text-destructive">*</span></Label>
              <Select value={approveOrgId} onValueChange={setApproveOrgId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select organization…" />
                </SelectTrigger>
                <SelectContent>
                  {allOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">({org.slug})</span>
                      </span>
                    </SelectItem>
                  ))}
                  {allOrgs.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No organizations available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmLoading} className="cursor-pointer">Cancel</Button>
            <Button variant={confirmAction?.type === "delete" || confirmAction?.type === "reject" ? "destructive" : "default"} onClick={executeConfirmAction} disabled={confirmLoading || (confirmAction?.type === "approve" && !approveOrgId)} className="cursor-pointer">
              {confirmLoading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing…</> : confirmAction?.type === "delete" ? "Delete" : confirmAction?.type === "ban" ? "Ban User" : confirmAction?.type === "unban" ? "Unban User" : confirmAction?.type === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
