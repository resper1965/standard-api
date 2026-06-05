import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useMemo } from "react";
import { useAdminUsers, useAdminOrgs, usePendingUserCount, qk } from "../../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { UserPlus, Search, AlertTriangle, RefreshCw, ShieldOff, Clock } from "lucide-react";

import { User } from "./components/admin-users-utils";
import { AdminUsersTable, AdminUsersEmptyState, TableSkeleton } from "./components/AdminUsersTable";
import { CreateUserDialog } from "./components/CreateUserDialog";
import { EditUserDialog } from "./components/EditUserDialog";
import { ConfirmActionDialog, ConfirmActionState } from "./components/ConfirmActionDialog";

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

  // Client-side search filter
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

  // ---- Modals State --------------------------------------------------------
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Fetch orgs for the approval org-selector
  const { data: orgsData } = useAdminOrgs(0, "");
  const allOrgs = (orgsData?.data ?? []) as { id: string; name: string; slug: string }[];

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
            <AdminUsersEmptyState search={search} onClearSearch={() => setSearch("")} />
          ) : (
            <AdminUsersTable 
              users={displayUsers}
              onEdit={setEditUser}
              onConfirmAction={(type, user) => setConfirmAction({ type, user })}
            />
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

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} onCreated={invalidate} />
      <EditUserDialog user={editUser} onOpenChange={(open) => !open && setEditUser(null)} onSaved={invalidate} />
      <ConfirmActionDialog action={confirmAction} allOrgs={allOrgs} onOpenChange={(open) => !open && setConfirmAction(null)} onSuccess={invalidate} />
    </div>
  );
}
