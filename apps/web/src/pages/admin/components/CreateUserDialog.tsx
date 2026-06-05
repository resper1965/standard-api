import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { Loader2, EyeOff, Eye, Shield, ShieldAlert } from "lucide-react";
import { passwordStrength } from "./admin-users-utils";
import { api } from "../../../lib/api";
import { useToast } from "../../../hooks/use-toast";
import { User } from "./admin-users-utils";

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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        onOpenChange(false);
        resetCreateForm();
        onCreated();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Creation failed", description: e instanceof Error ? e.message : "Failed to create user." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetCreateForm(); onOpenChange(o); }}>
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
            <Button type="button" variant="outline" onClick={() => { resetCreateForm(); onOpenChange(false); }} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={creating} className="cursor-pointer">
              {creating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating…</> : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
