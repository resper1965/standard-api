import { useEffect, useState, useMemo, useCallback } from "react";
import type { FormEvent } from "react";
import { useSession } from "../../lib/auth-client";
import { api } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Loader2,
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  LogOut,
  Building2,
  Search,
  RefreshCw,
  AlertTriangle,
  Copy,
  Info,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Relative time formatter — e.g. "2 days ago", "just now" */
function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/** Auto-generate slug from org name */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Skeleton Rows
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function OrgsEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-5 ring-1 ring-border/40">
        <Building2 className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        No organizations yet
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[340px] mb-6 leading-relaxed">
        Organizations let you group users, manage access, and isolate
        assessments. Create your first one to get started.
      </p>
      <Button onClick={onCreateClick} size="sm" className="cursor-pointer">
        <Plus className="h-4 w-4 mr-1.5" />
        Create Organization
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metadata Tooltip
// ---------------------------------------------------------------------------

function MetadataPopover({ metadata }: { metadata?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  if (!metadata || Object.keys(metadata).length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
        title="View metadata"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[200px] max-w-[320px] rounded-lg border border-border/60 bg-popover/95 backdrop-blur-xl p-3 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Metadata
            </p>
            <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminOrganizations() {
  const { data: session } = useSession();
  const activeOrgId =
    (session?.session as Record<string, unknown>)?.activeOrganizationId as string | null ?? null;

  // Data
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgSlug, setEditOrgSlug] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Action states
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const { toast } = useToast();

  // -----------------------------------------------------------------------
  // Data fetching — uses our own API exclusively
  // -----------------------------------------------------------------------

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: Organization[] }>("/api/v1/users/me/organizations");
      const dataArray = Array.isArray(res?.data) ? res.data : [];
      setOrgs(dataArray);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to fetch organizations";
      console.error("[AdminOrganizations] fetch error:", e);
      setError(msg);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // -----------------------------------------------------------------------
  // Filtered orgs
  // -----------------------------------------------------------------------

  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return orgs;
    const q = searchQuery.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }, [orgs, searchQuery]);

  // -----------------------------------------------------------------------
  // Activate / Deactivate
  // -----------------------------------------------------------------------

  const handleActivate = async (orgId: string) => {
    setActivating(orgId);
    try {
      await api(`/api/v1/users/me/organizations/${orgId}/activate`, { method: "POST" });
      toast({
        title: "Organization activated",
        description: "Reloading to apply context…",
      });
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not activate organization";
      toast({
        variant: "destructive",
        title: "Activation failed",
        description: msg,
      });
      setActivating(null);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const activeOrgId = session?.session?.activeOrganizationId;
      if (activeOrgId) {
        await api(`/api/v1/users/me/organizations/${activeOrgId}/deactivate`, { method: "POST" });
      }
      toast({
        title: "Organization deactivated",
        description: "No organization is now active.",
      });
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not deactivate organization";
      toast({
        variant: "destructive",
        title: "Deactivation failed",
        description: msg,
      });
    } finally {
      setDeactivating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Create — uses our own API
  // -----------------------------------------------------------------------

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api("/api/v1/users/me/organizations", {
        method: "POST",
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      });
      setShowCreateModal(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setAutoSlug(true);
      await fetchOrgs();
      toast({
        title: "Organization created",
        description: `"${newOrgName}" is ready to use.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred.";
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: msg,
      });
    } finally {
      setCreating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Edit — uses our own API
  // -----------------------------------------------------------------------

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
      await api(`/api/v1/organizations/${editingOrg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editOrgName, slug: editOrgSlug }),
      });
      setEditingOrg(null);
      await fetchOrgs();
      toast({
        title: "Organization updated",
        description: "Changes saved successfully.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred.";
      toast({
        variant: "destructive",
        title: "Update failed",
        description: msg,
      });
    } finally {
      setUpdating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete — uses our own API with typed confirmation
  // -----------------------------------------------------------------------

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await api(`/api/v1/organizations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await fetchOrgs();
      toast({
        title: "Organization deleted",
        description: `"${deleteTarget.name}" has been permanently removed.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred.";
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: msg,
      });
    } finally {
      setDeleting(null);
    }
  };

  const copyOrgId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      toast({ title: "Copied", description: "Organization ID copied to clipboard." });
    });
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const deleteConfirmValid =
    deleteTarget && deleteConfirmText === deleteTarget.name;

  return (
    <div className="space-y-6">
      {/* Header bar — search + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search organizations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/40 focus:bg-background transition-colors duration-200"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Deactivate active org (if one is active) */}
          {activeOrgId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 cursor-pointer transition-colors duration-200"
            >
              {deactivating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deactivating…
                </>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Deactivate Current
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrgs}
            disabled={loading}
            className="cursor-pointer transition-colors duration-200"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrgs}
            className="shrink-0 cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main table card */}
      <Card className="border-border/60 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : filteredOrgs.length === 0 && !error ? (
            orgs.length === 0 ? (
              <OrgsEmptyState
                onCreateClick={() => setShowCreateModal(true)}
              />
            ) : (
              /* Search returned no results */
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No results for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try a different search term.</p>
              </div>
            )
          ) : (
            <>
              {/* Results count */}
              {searchQuery.trim() && (
                <div className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border/40">
                  {filteredOrgs.length}{" "}
                  {filteredOrgs.length === 1 ? "result" : "results"} found
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map((o) => {
                      const isActive = activeOrgId === o.id;
                      return (
                        <TableRow
                          key={o.id}
                          className={`transition-colors duration-150 hover:bg-muted/50 ${
                            isActive
                              ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]"
                              : ""
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Avatar / icon */}
                              <div
                                className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 ${
                                  isActive
                                    ? "bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                    : "bg-muted/60 text-muted-foreground"
                                }`}
                              >
                                {o.logo ? (
                                  <img
                                    src={o.logo}
                                    alt={o.name}
                                    className="h-9 w-9 rounded-lg object-cover"
                                  />
                                ) : (
                                  o.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {o.name}
                                  </span>
                                  {isActive && (
                                    <Badge variant="success" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Active
                                    </Badge>
                                  )}
                                  <MetadataPopover metadata={o.metadata as Record<string, unknown>} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyOrgId(o.id)}
                                  className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 cursor-pointer group"
                                  title="Copy ID"
                                >
                                  {o.id.slice(0, 8)}…
                                  <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <code className="font-mono text-xs text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                              {o.slug}
                            </code>
                          </TableCell>

                          <TableCell>
                            <span
                              className="text-sm text-muted-foreground"
                              title={new Date(o.createdAt).toLocaleString()}
                            >
                              {relativeTime(o.createdAt)}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Activate / Deactivate */}
                              {!isActive ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivate(o.id)}
                                  disabled={
                                    activating === o.id || !!deleting
                                  }
                                  className="cursor-pointer transition-all duration-200 text-xs h-8"
                                >
                                  {activating === o.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Activating…
                                    </>
                                  ) : (
                                    "Activate"
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleDeactivate}
                                  disabled={deactivating}
                                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 cursor-pointer transition-all duration-200 text-xs h-8"
                                >
                                  {deactivating ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Deactivating…
                                    </>
                                  ) : (
                                    <>
                                      <LogOut className="h-3 w-3 mr-1" />
                                      Deactivate
                                    </>
                                  )}
                                </Button>
                              )}

                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(o)}
                                disabled={activating === o.id || !!deleting}
                                className="cursor-pointer transition-colors duration-150 h-8 w-8 p-0"
                                title="Edit organization"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive/60 hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors duration-150 h-8 w-8 p-0"
                                onClick={() => {
                                  if (isActive) {
                                    toast({
                                      variant: "destructive",
                                      title:
                                        "Cannot delete active organization",
                                      description:
                                        "Deactivate this organization before deleting it.",
                                    });
                                    return;
                                  }
                                  setDeleteTarget(o);
                                  setDeleteConfirmText("");
                                }}
                                disabled={deleting === o.id || activating === o.id}
                                title="Delete organization"
                              >
                                {deleting === o.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-border/40">
                {filteredOrgs.map((o) => {
                  const isActive = activeOrgId === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`p-4 space-y-3 transition-colors duration-150 ${
                        isActive ? "bg-emerald-500/[0.03]" : ""
                      }`}
                    >
                      {/* Name row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isActive
                                ? "bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                : "bg-muted/60 text-muted-foreground"
                            }`}
                          >
                            {o.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {o.name}
                              </span>
                              {isActive && (
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <code className="text-[11px] font-mono text-muted-foreground">
                              {o.slug}
                            </code>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {relativeTime(o.createdAt)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {!isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(o.id)}
                            disabled={activating === o.id || !!deleting}
                            className="cursor-pointer text-xs h-8 flex-1"
                          >
                            {activating === o.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Activating…
                              </>
                            ) : (
                              "Activate"
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer text-xs h-8 flex-1"
                          >
                            {deactivating ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Deactivating…
                              </>
                            ) : (
                              <>
                                <LogOut className="h-3 w-3 mr-1" />
                                Deactivate
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(o)}
                          disabled={!!deleting}
                          className="cursor-pointer h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive/60 hover:bg-destructive/10 hover:text-destructive cursor-pointer h-8 w-8 p-0"
                          onClick={() => {
                            if (isActive) {
                              toast({
                                variant: "destructive",
                                title: "Cannot delete active organization",
                                description:
                                  "Deactivate this organization before deleting it.",
                              });
                              return;
                            }
                            setDeleteTarget(o);
                            setDeleteConfirmText("");
                          }}
                          disabled={deleting === o.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* Create Organization Dialog                                         */}
      {/* ================================================================= */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setNewOrgName("");
            setNewOrgSlug("");
            setAutoSlug(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-border/60 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Create Organization
            </DialogTitle>
            <DialogDescription>
              Add a new organization to manage users and assessments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-org-name">Name</Label>
              <Input
                id="create-org-name"
                required
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value);
                  if (autoSlug) setNewOrgSlug(slugify(e.target.value));
                }}
                placeholder="Acme Corporation"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-org-slug">Slug</Label>
              <Input
                id="create-org-slug"
                required
                value={newOrgSlug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setNewOrgSlug(e.target.value);
                }}
                placeholder="acme-corp"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                URL-safe identifier. Auto-generated from the name.
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="cursor-pointer">
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Edit Organization Dialog                                           */}
      {/* ================================================================= */}
      <Dialog
        open={!!editingOrg}
        onOpenChange={(open) => {
          if (!open) setEditingOrg(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-border/60 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-muted-foreground" />
              Edit Organization
            </DialogTitle>
            <DialogDescription>
              Update the name or slug of this organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Name</Label>
              <Input
                id="edit-org-name"
                required
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-slug">Slug</Label>
              <Input
                id="edit-org-slug"
                required
                value={editOrgSlug}
                onChange={(e) => setEditOrgSlug(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            {editingOrg && (
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono">
                ID: {editingOrg.id}
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingOrg(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating} className="cursor-pointer">
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Delete Confirmation Dialog                                          */}
      {/* ================================================================= */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-destructive/30 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All data associated
              with this organization will be lost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {deleteTarget && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1">
                <p className="text-sm font-medium">{deleteTarget.name}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {deleteTarget.slug} · {deleteTarget.id.slice(0, 12)}…
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type{" "}
                <span className="font-semibold text-foreground">
                  {deleteTarget?.name}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget?.name}
                className="font-mono text-sm"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmText("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteConfirmValid || !!deleting}
              onClick={handleDeleteConfirm}
              className="cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Forever
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
