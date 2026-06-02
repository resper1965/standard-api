import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useActiveOrg } from "@/hooks/useActiveOrg";
import {
  useOrgWebhooks, useCreateWebhook, useDeleteWebhook, useWebhookDeliveries,
} from "@/lib/queries";
import {
  Plus, Trash2, RotateCcw, Send, ChevronDown, ChevronUp,
  Webhook, Copy, Check, AlertCircle, CircleCheck, Circle,
  Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  { value: "assessment.created",         label: "Assessment Created",         group: "Assessment" },
  { value: "assessment.status_changed",  label: "Assessment Status Changed",  group: "Assessment" },
  { value: "assessment.closed",          label: "Assessment Closed",          group: "Assessment" },
  { value: "gap.approved",              label: "Gap Analysis Approved",      group: "Gap Analysis" },
  { value: "maturity.approved",         label: "Maturity Approved",          group: "Maturity" },
  { value: "poam.approved",             label: "POA&M Approved",             group: "POA&M" },
  { value: "report.generated",          label: "Report Generated",           group: "Report" },
  { value: "document.uploaded",         label: "Document Uploaded",          group: "Documents" },
  { value: "api_key.created",           label: "API Key Created",            group: "Security" },
  { value: "api_key.revoked",           label: "API Key Revoked",            group: "Security" },
] as const;

type WebhookEventValue = (typeof WEBHOOK_EVENTS)[number]["value"];

interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEventValue[];
  description?: string;
  enabled: boolean;
  signing_secret_masked: string;
  created_at: string;
  updated_at: string;
}

interface WebhookDelivery {
  delivery_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: "delivered" | "failed" | "pending";
  http_status?: number;
  attempt_count: number;
  last_attempted_at?: string;
  response_body?: string;
}

// ─── Clipboard helper ────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ─── Event Selector ──────────────────────────────────────────────
function EventSelector({
  selected,
  onChange,
}: {
  selected: WebhookEventValue[];
  onChange: (v: WebhookEventValue[]) => void;
}) {
  const groups = [...new Set(WEBHOOK_EVENTS.map((e) => e.group))];

  const toggleEvent = (v: WebhookEventValue) => {
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    );
  };

  const selectAll = () => onChange(WEBHOOK_EVENTS.map((e) => e.value));
  const clearAll  = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Events to subscribe</Label>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={selectAll}
          >
            All
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={clearAll}
          >
            None
          </button>
        </div>
      </div>
      {groups.map((group) => (
        <div key={group}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {WEBHOOK_EVENTS.filter((e) => e.group === group).map((ev) => {
              const active = selected.includes(ev.value);
              return (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    active
                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  {ev.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Delivery row ────────────────────────────────────────────────
function DeliveryRow({ d }: { d: WebhookDelivery }) {
  const [open, setOpen] = useState(false);
  const ok = d.status === "delivered";

  return (
    <>
      <div
        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 cursor-pointer text-xs transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {ok
            ? <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            : <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          }
          <span className="font-mono text-foreground truncate">{d.event_type}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className={ok ? "text-emerald-500" : "text-destructive"}>
            {d.http_status ?? "—"}
          </span>
          <span className="text-muted-foreground">
            {d.last_attempted_at ? new Date(d.last_attempted_at).toLocaleString() : "—"}
          </span>
          {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>
      {open && d.response_body && (
        <div className="px-3 pb-2">
          <pre className="text-[11px] font-mono text-muted-foreground bg-muted/30 rounded p-2.5 overflow-x-auto whitespace-pre-wrap break-all">
            {d.response_body.slice(0, 400)}{d.response_body.length > 400 ? "…" : ""}
          </pre>
        </div>
      )}
    </>
  );
}

// ─── Webhook row ─────────────────────────────────────────────────
function WebhookRow({
  endpoint,
  orgId,
  onDelete,
  onRotateSecret,
  onTest,
}: {
  endpoint: WebhookEndpoint;
  orgId: string;
  onDelete: (id: string) => void;
  onRotateSecret: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { copied, copy } = useCopy();

  const deliveriesQuery = useWebhookDeliveries(orgId, expanded ? endpoint.id : undefined);
  const deliveries = (deliveriesQuery.data?.data ?? []) as WebhookDelivery[];

  return (
    <Card className="border-border/60 bg-card/60 shadow-none">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${endpoint.enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={endpoint.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-foreground hover:underline flex items-center gap-1 truncate max-w-xs"
                >
                  {endpoint.url}
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </a>
                {!endpoint.enabled && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Disabled
                  </Badge>
                )}
              </div>
              {endpoint.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{endpoint.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {endpoint.events.map((ev) => (
                  <span
                    key={ev}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 font-mono"
                  >
                    {ev}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {endpoint.signing_secret_masked}
                </span>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy masked secret"
                  onClick={() => copy(endpoint.signing_secret_masked, endpoint.id + "-secret")}
                >
                  {copied === endpoint.id + "-secret"
                    ? <Check className="h-3 w-3 text-emerald-500" />
                    : <Copy className="h-3 w-3" />
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Send test event"
              onClick={() => onTest(endpoint.id)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-amber-500"
              title="Rotate signing secret"
              onClick={() => onRotateSecret(endpoint.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Delete endpoint"
              onClick={() => onDelete(endpoint.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border/40 px-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground py-2.5">
              Recent Deliveries
              {deliveriesQuery.isLoading && <span className="ml-2 opacity-60">Loading…</span>}
            </p>
            {deliveries.length === 0 && !deliveriesQuery.isLoading ? (
              <p className="text-xs text-muted-foreground py-2">No deliveries yet.</p>
            ) : (
              <div className="space-y-0.5">
                {deliveries.map((d) => <DeliveryRow key={d.delivery_id} d={d} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export function WebhooksPage() {
  useDocumentTitle("Webhooks");
  const { orgId } = useActiveOrg();

  const { data: webhooksData, isLoading, error: loadError } = useOrgWebhooks(orgId);
  const endpoints = (webhooksData?.data ?? []) as WebhookEndpoint[];

  const createMutation = useCreateWebhook(orgId ?? "");
  const deleteMutation = useDeleteWebhook(orgId ?? "");

  // Create dialog
  const [createOpen, setCreateOpen]   = useState(false);
  const [newUrl, setNewUrl]           = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newEvents, setNewEvents]     = useState<WebhookEventValue[]>([]);
  const [createError, setCreateError] = useState("");

  // New secret reveal (shown once after create/rotate)
  const [revealSecret, setRevealSecret] = useState<{ id: string; secret: string } | null>(null);
  const [showSecret, setShowSecret]     = useState(false);
  const { copied, copy } = useCopy();

  // Test result
  const [testResult, setTestResult]   = useState<{ success: boolean; message: string } | null>(null);
  const [testOpen, setTestOpen]       = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newUrl.trim()) { setCreateError("URL is required."); return; }
    if (newEvents.length === 0) { setCreateError("Select at least one event."); return; }
    setCreateError("");
    createMutation.mutate(
      { url: newUrl.trim(), events: newEvents as string[], description: newDesc.trim() || undefined },
      {
        onSuccess: (res) => {
          const ep = res?.data as (WebhookEndpoint & { signing_secret?: string }) | undefined;
          if (ep?.signing_secret) {
            setRevealSecret({ id: ep.id, secret: ep.signing_secret });
            setShowSecret(false);
          }
          setCreateOpen(false);
          setNewUrl(""); setNewDesc(""); setNewEvents([]);
        },
        onError: (e) => {
          setCreateError(e instanceof ApiError ? e.message : "Failed to create webhook.");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    });
  };

  const handleRotate = async (id: string) => {
    try {
      const res = await api<{ data: WebhookEndpoint & { signing_secret: string } }>(
        `/api/v1/webhooks/${id}/rotate-secret`,
        { method: "POST" }
      );
      if (res?.data?.signing_secret) {
        setRevealSecret({ id, secret: res.data.signing_secret });
        setShowSecret(false);
      }
    } catch {
      // silent
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await api<{ data: { success: boolean; message: string } }>(
        `/api/v1/webhooks/${id}/test`,
        { method: "POST" }
      );
      setTestResult(res?.data ?? { success: false, message: "No response." });
      setTestOpen(true);
    } catch (e) {
      setTestResult({ success: false, message: e instanceof ApiError ? e.message : "Test failed." });
      setTestOpen(true);
    }
  };

  const loadErrorMsg = loadError instanceof Error ? loadError.message : loadError ? "Failed to load webhooks." : "";

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Register HTTP endpoints to receive real-time event notifications when lifecycle states
            change. All deliveries are signed with HMAC-SHA256.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => { setCreateOpen(true); setCreateError(""); }}
          disabled={!orgId}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Endpoint
        </Button>
      </div>

      {/* Signing secret reveal banner */}
      {revealSecret && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Signing Secret — store this now</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  This is shown <strong>once only</strong>. Copy it before closing.
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted/50 rounded px-2 py-1.5 flex-1 overflow-x-auto select-all">
                    {showSecret ? revealSecret.secret : "whsec_" + "•".repeat(40)}
                  </code>
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    onClick={() => setShowSecret((v) => !v)}
                    title={showSecret ? "Hide" : "Show"}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    onClick={() => copy(revealSecret.secret, "reveal")}
                    title="Copy"
                  >
                    {copied === "reveal"
                      ? <Check className="h-4 w-4 text-emerald-500" />
                      : <Copy className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setRevealSecret(null)}
              >
                ✕
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No org warning */}
      {!orgId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-lg border border-border/40 bg-muted/20">
          <Circle className="h-4 w-4 shrink-0" />
          Select an active organization to manage webhooks.
        </div>
      )}

      {/* Error */}
      {loadErrorMsg && (
        <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadErrorMsg}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/60 shadow-none animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 w-64 bg-muted rounded mb-2" />
                <div className="h-3 w-40 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Endpoints list */}
      {!isLoading && endpoints.length === 0 && orgId && (
        <Card className="border-dashed border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Webhook className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">No webhook endpoints</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Add an endpoint to start receiving signed event notifications.
            </p>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add first endpoint
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && endpoints.map((ep) => (
        <WebhookRow
          key={ep.id}
          endpoint={ep}
          orgId={orgId ?? ""}
          onDelete={setDeleteId}
          onRotateSecret={handleRotate}
          onTest={handleTest}
        />
      ))}

      {/* ── Create Dialog ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Subscribe to lifecycle events. Your endpoint will receive signed POST requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input
                id="wh-url"
                placeholder="https://your-app.com/webhooks/standard"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="wh-desc"
                placeholder="Production webhook"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <EventSelector selected={newEvents} onChange={setNewEvents} />
            {createError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {createError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Endpoint?</DialogTitle>
            <DialogDescription>
              This action is irreversible. The endpoint will stop receiving events immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Test Result ───────────────────────────────── */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success
                ? <CircleCheck className="h-5 w-5 text-emerald-500" />
                : <AlertCircle className="h-5 w-5 text-destructive" />
              }
              Test Delivery
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {testResult?.message}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
