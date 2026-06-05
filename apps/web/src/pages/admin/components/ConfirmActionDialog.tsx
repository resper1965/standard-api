import { useState, type ComponentType } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { Loader2, Trash2, Ban, UserCheck, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../lib/api";
import { useToast } from "../../../hooks/use-toast";
import { User } from "./admin-users-utils";

export type ConfirmActionType = "ban" | "unban" | "delete" | "approve" | "reject";

export interface ConfirmActionState {
  type: ConfirmActionType;
  user: User;
}

interface ConfirmActionDialogProps {
  action: ConfirmActionState | null;
  allOrgs: { id: string; name: string; slug: string }[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/* ─── per-action-type presentation config ─── */

interface ActionMeta {
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  buttonLabel: string;
  buttonVariant: "default" | "destructive";
  description: (email: string) => React.ReactNode;
}

const emailHighlight = (email: string) => (
  <span className="font-medium text-foreground">{email}</span>
);

const ACTION_CONFIG: Record<ConfirmActionType, ActionMeta> = {
  delete: {
    icon: Trash2,
    iconClass: "h-5 w-5 text-destructive",
    title: "Delete User",
    buttonLabel: "Delete",
    buttonVariant: "destructive",
    description: (email) => <>This will permanently delete {emailHighlight(email)}. This action cannot be undone.</>,
  },
  ban: {
    icon: Ban,
    iconClass: "h-5 w-5 text-amber-500",
    title: "Ban User",
    buttonLabel: "Ban User",
    buttonVariant: "default",
    description: (email) => <>{emailHighlight(email)} will be banned and unable to log in.</>,
  },
  unban: {
    icon: UserCheck,
    iconClass: "h-5 w-5 text-emerald-500",
    title: "Unban User",
    buttonLabel: "Unban User",
    buttonVariant: "default",
    description: (email) => <>{emailHighlight(email)} will be unbanned and able to log in again.</>,
  },
  approve: {
    icon: CheckCircle2,
    iconClass: "h-5 w-5 text-emerald-500",
    title: "Approve User",
    buttonLabel: "Approve",
    buttonVariant: "default",
    description: (email) => <>Select an organization for {emailHighlight(email)} and approve their access.</>,
  },
  reject: {
    icon: XCircle,
    iconClass: "h-5 w-5 text-destructive",
    title: "Reject Registration",
    buttonLabel: "Reject",
    buttonVariant: "destructive",
    description: (email) => <>The registration for {emailHighlight(email)} will be rejected and the account permanently removed.</>,
  },
};

/* ─── component ─── */

export function ConfirmActionDialog({ action, allOrgs, onOpenChange, onSuccess }: ConfirmActionDialogProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [approveOrgId, setApproveOrgId] = useState("");

  const { toast } = useToast();

  const resetState = () => {
    setBanReason("");
    setApproveOrgId("");
  };

  const config = action ? ACTION_CONFIG[action.type] : null;

  const executeConfirmAction = async () => {
    if (!action) return;
    const { type, user } = action;
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
      onOpenChange(false);
      resetState();
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: `${type.charAt(0).toUpperCase() + type.slice(1)} failed`, description: e instanceof Error ? e.message : `Failed to ${type} user.` });
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={(open) => { if (!open) { onOpenChange(false); resetState(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config && <config.icon className={config.iconClass} />}
            {config?.title}
          </DialogTitle>
          <DialogDescription>
            {action && config?.description(action.user.email)}
          </DialogDescription>
        </DialogHeader>
        {action?.type === "ban" && (
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason" className="text-xs">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <textarea id="ban-reason" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Violated terms of service" rows={2} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        )}
        {action?.type === "approve" && (
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmLoading} className="cursor-pointer">Cancel</Button>
          <Button variant={config?.buttonVariant ?? "default"} onClick={executeConfirmAction} disabled={confirmLoading || (action?.type === "approve" && !approveOrgId)} className="cursor-pointer">
            {confirmLoading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing…</> : config?.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
