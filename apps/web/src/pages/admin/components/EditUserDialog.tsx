import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { Loader2, Shield, ShieldAlert } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { api } from "../../../lib/api";
import { useToast } from "../../../hooks/use-toast";
import { User, getInitials } from "./admin-users-utils";

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

interface EditUserDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditUserDialog({ user, onOpenChange, onSaved }: EditUserDialogProps) {
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditRole(user.role || "user");
    }
  }, [user]);

  const handleSaveEdit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(editName !== user.name ? { name: editName } : {}),
          ...(editRole !== user.role ? { role: editRole } : {}),
        }),
      });
      toast({ title: "User updated", description: "Changes saved successfully." });
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed", description: e instanceof Error ? e.message : "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user?.email ? <span className="font-mono text-xs">{user.email}</span> : "Update user details."}</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <UserAvatar name={editName || user.name} banned={user.banned} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{editName || user.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              {user.banned && <Badge variant="destructive" className="ml-auto shrink-0">Banned</Badge>}
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
              <p className="font-mono text-xs text-muted-foreground break-all select-all">{user.id}</p>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="cursor-pointer">
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
