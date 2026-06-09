import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { Pencil, ShieldAlert, Shield, Ban, Trash2, UserCheck, CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { relativeTime, getInitials, User } from "./admin-users-utils";

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

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
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

interface AdminUsersTableProps {
  users: User[];
  onEdit: (u: User) => void;
  onConfirmAction: (type: "ban" | "unban" | "delete" | "approve" | "reject", user: User) => void;
}

export function AdminUsersTable({ users, onEdit, onConfirmAction }: AdminUsersTableProps) {
  return (
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
        {users.map((u) => (
          <TableRow
            key={u.id}
            className={`transition-colors duration-150 ${
              u.banned ? "opacity-60" : !u.approved ? "bg-amber-500/5" : "hover:bg-muted/40"
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
              {!u.approved ? (
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
                {!u.approved ? (
                  <>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onConfirmAction("approve", u)}
                      className="h-8 w-8 p-0 cursor-pointer text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                      title="Approve user"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onConfirmAction("reject", u)}
                      className="h-8 w-8 p-0 cursor-pointer text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      title="Reject registration"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(u)} className="h-8 w-8 p-0 cursor-pointer" title="Edit user">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onConfirmAction(u.banned ? "unban" : "ban", u)}
                      className={`h-8 w-8 p-0 cursor-pointer ${u.banned ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"}`}
                      title={u.banned ? "Unban user" : "Ban user"}
                    >
                      {u.banned ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onConfirmAction("delete", u)}
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
  );
}

export function AdminUsersEmptyState({ search, onClearSearch }: { search: string; onClearSearch: () => void }) {
  return (
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
        <Button variant="outline" size="sm" onClick={onClearSearch} className="cursor-pointer">
          Clear search
        </Button>
      )}
    </div>
  );
}
