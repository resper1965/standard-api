import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useMemo } from "react";
import {
  useScfLatestVersion,
  useScfDomains,
  useScfControls,
  useScfFrameworks,
  useScfFrameworkCoverage,
} from "@/lib/queries";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Layers, ShieldCheck, BookMarked, Search, Loader2, AlertCircle,
  X, FileBox, ChevronDown,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

type ScfDomain = {
  id: string;
  domain_code: string;
  domain_name: string;
  description?: string;
};

type ScfControl = {
  control_id: string;
  scf_domain_id: string;
  control_code: string;
  control_title: string;
  control_description?: string;
  control_question?: string;
  control_intent?: string;
  implementation_guidance?: string;
  expected_evidence?: string;
  status: string;
};

type ScfFramework = {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  framework_version?: string;
  publisher?: string;
  jurisdiction?: string;
  category?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ds-text-muted)" }} />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg p-4 text-sm flex items-center gap-2"
      style={{
        background: "var(--ds-error-light)",
        border: "1px solid rgba(248,113,113,0.18)",
        color: "var(--ds-error)",
      }}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error instanceof Error ? error.message : "Failed to load SCF data."}
    </div>
  );
}

function DSEmptyState({ icon: Icon, label }: { icon: typeof Layers; label: string }) {
  return (
    <div className="ds-empty">
      <div className="ds-empty-icon">
        <Icon className="h-5 w-5" />
      </div>
      <p className="ds-empty-title">{label}</p>
    </div>
  );
}

// ─── Accordion item ─────────────────────────────────────────────────────────────

function DomainAccordion({
  domain,
  versionId,
  onControlClick,
}: {
  domain: ScfDomain;
  versionId?: string;
  onControlClick: (ctrl: ScfControl) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useScfControls(
    open ? versionId : undefined,
    { domainCode: domain.domain_code }
  );
  const controls = (data?.data ?? []) as ScfControl[];

  return (
    <div className={`ds-accordion-item${open ? " is-open" : ""}`}>
      <button
        className="ds-accordion-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="ds-accordion-trigger-left">
          <div className="ds-accordion-icon" aria-hidden="true">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-semibold text-sm leading-tight" style={{ color: "var(--ds-text)" }}>
              {domain.domain_name}
            </span>
            <span className="block text-xs mt-0.5" style={{ color: "var(--ds-text-muted)" }}>
              {domain.domain_code}
            </span>
          </div>
        </div>
        <ChevronDown className="ds-accordion-chevron h-4 w-4" />
      </button>

      <div className="ds-accordion-content">
        <div className="ds-accordion-inner">
          <div className="ds-accordion-body">
            {!open ? null : isLoading ? (
              <Spinner />
            ) : controls.length === 0 ? (
              <DSEmptyState icon={ShieldCheck} label="No controls in this domain." />
            ) : (
              controls.map((ctrl) => (
                <button
                  key={ctrl.control_id}
                  className="ds-control-row w-full text-left"
                  onClick={() => onControlClick(ctrl)}
                >
                  <span className="ds-control-code">{ctrl.control_code}</span>
                  <span className="ds-control-name">{ctrl.control_title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Domains Tab (Accordion layout) ──────────────────────────────────────────────

function DomainsTab({
  versionId,
}: {
  versionId?: string;
}) {
  const [selected, setSelected] = useState<ScfControl | null>(null);
  const { data, isLoading, error } = useScfDomains(versionId);
  const domains = (data?.data ?? []) as ScfDomain[];

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} />;
  if (domains.length === 0) return <DSEmptyState icon={Layers} label="No domains found." />;

  return (
    <>
      <div className="ds-accordion">
        {domains.map((d) => (
          <DomainAccordion
            key={d.id}
            domain={d}
            versionId={versionId}
            onControlClick={setSelected}
          />
        ))}
      </div>

      {/* Control detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="ds-badge ds-badge--active font-mono">{selected?.control_code}</span>
              <span className="text-base">{selected?.control_title}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">SCF control detail</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {selected.control_description ? (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Description</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>
                    {selected.control_description}
                  </p>
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--ds-text-muted)" }}>No description available.</p>
              )}

              {selected.control_question && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Control Question</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>
                    {selected.control_question}
                  </p>
                </div>
              )}

              {selected.control_intent && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Control Intent</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>
                    {selected.control_intent}
                  </p>
                </div>
              )}

              {selected.implementation_guidance && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Implementation Guidance</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>
                    {selected.implementation_guidance}
                  </p>
                </div>
              )}

              {selected.expected_evidence && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Expected Evidence</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>
                    {selected.expected_evidence}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <span className="ds-badge ds-badge--muted capitalize">{selected.status}</span>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--ds-border)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--ds-text-muted)" }}>Control ID</p>
                <p className="font-mono text-xs break-all select-all" style={{ color: "var(--ds-text-muted)" }}>{selected.control_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Controls Tab ───────────────────────────────────────────────────────────────

function ControlsTab({
  versionId,
  domainCode,
  onClearDomain,
}: {
  versionId?: string;
  domainCode: string;
  onClearDomain: () => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScfControl | null>(null);

  const { data, isLoading, isFetching, error } = useScfControls(versionId, {
    domainCode: domainCode || undefined,
    q: query || undefined,
  });
  const controls = (data?.data ?? []) as ScfControl[];

  const applySearch = () => setQuery(searchInput.trim());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-text-muted)" }} />
          <Input
            placeholder="Search controls by code or title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
            className="pl-9"
          />
        </div>
        <Button onClick={applySearch} disabled={isFetching}>Search</Button>
      </div>

      {(domainCode || query) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "var(--ds-text-muted)" }}>Filters:</span>
          {domainCode && (
            <span className="ds-badge ds-badge--active gap-1">
              Domain: {domainCode}
              <button onClick={onClearDomain} aria-label="Clear domain filter"><X className="h-3 w-3" /></button>
            </span>
          )}
          {query && (
            <span className="ds-badge ds-badge--muted gap-1">
              "{query}"
              <button onClick={() => { setQuery(""); setSearchInput(""); }} aria-label="Clear search"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} />
      ) : controls.length === 0 ? (
        <DSEmptyState icon={ShieldCheck} label="No controls match your filters." />
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>{controls.length} control{controls.length !== 1 ? "s" : ""}</p>
          <div className="ds-table-wrapper">
            {controls.map((c) => (
              <button
                key={c.control_id}
                onClick={() => setSelected(c)}
                className="ds-control-row w-full text-left"
              >
                <span className="ds-control-code">{c.control_code}</span>
                <div className="min-w-0">
                  <span className="ds-control-name block">{c.control_title}</span>
                  {c.control_description && (
                    <span className="text-xs block mt-0.5 line-clamp-1" style={{ color: "var(--ds-text-muted)" }}>
                      {c.control_description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Control detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="ds-badge ds-badge--active font-mono">{selected?.control_code}</span>
              <span className="text-base">{selected?.control_title}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">SCF control detail</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {selected.control_description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Description</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>{selected.control_description}</p>
                </div>
              )}
              {selected.control_question && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Control Question</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>{selected.control_question}</p>
                </div>
              )}
              {selected.implementation_guidance && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Implementation Guidance</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>{selected.implementation_guidance}</p>
                </div>
              )}
              {selected.expected_evidence && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Expected Evidence</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--ds-text-sub)" }}>{selected.expected_evidence}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="ds-badge ds-badge--muted capitalize">{selected.status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Frameworks Tab ──────────────────────────────────────────────────────────────

function FrameworkCoverage({ frameworkId, versionId }: { frameworkId: string; versionId?: string }) {
  const { data, isLoading } = useScfFrameworkCoverage(frameworkId, versionId);
  if (isLoading) return <span className="text-[11px]" style={{ color: "var(--ds-text-muted)" }}>Loading…</span>;
  if (!data) return null;
  const pct = data.requirement_count > 0
    ? Math.round((data.mapped_requirement_count / data.requirement_count) * 100)
    : 0;
  return (
    <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ds-text-muted)" }}>
      <span>{data.requirement_count} reqs</span>
      <span>·</span>
      <span>{data.control_count} controls</span>
      <span>·</span>
      <span style={{ color: "var(--ds-accent)", fontWeight: 600 }}>{pct}% mapped</span>
    </div>
  );
}

function FrameworksTab({ versionId }: { versionId?: string }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useScfFrameworks();
  const frameworks = (data?.data ?? []) as ScfFramework[];

  const filtered = useMemo(() => {
    if (!search.trim()) return frameworks;
    const q = search.toLowerCase();
    return frameworks.filter(
      (f) =>
        f.framework_name.toLowerCase().includes(q) ||
        f.framework_code.toLowerCase().includes(q) ||
        (f.publisher ?? "").toLowerCase().includes(q) ||
        (f.jurisdiction ?? "").toLowerCase().includes(q)
    );
  }, [frameworks, search]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-text-muted)" }} />
        <Input
          placeholder="Search frameworks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <DSEmptyState icon={BookMarked} label="No frameworks match your search." />
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
            {filtered.length} framework{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((f) => (
              <div
                key={f.framework_id}
                className="p-4 rounded-xl space-y-2 transition-colors"
                style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid var(--ds-border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(143,168,155,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--ds-border)";
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: "var(--ds-text)" }}>{f.framework_name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="ds-badge ds-badge--active font-mono text-[10px]">{f.framework_code}</span>
                      {f.framework_version && (
                        <span className="text-[10px]" style={{ color: "var(--ds-text-muted)" }}>v{f.framework_version}</span>
                      )}
                    </div>
                  </div>
                  {f.category && (
                    <span className="ds-badge ds-badge--muted text-[9px] shrink-0 capitalize">{f.category}</span>
                  )}
                </div>
                {(f.publisher || f.jurisdiction) && (
                  <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
                    {[f.publisher, f.jurisdiction].filter(Boolean).join(" · ")}
                  </p>
                )}
                <FrameworkCoverage frameworkId={f.framework_id} versionId={versionId} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export function ScfExplorerPage() {
  useDocumentTitle("SCF Explorer");

  const { data: version, isLoading: versionLoading, error: versionError } = useScfLatestVersion();
  const versionId = version?.scf_version_id;

  const [tab, setTab] = useState("domains");
  const [domainFilter, setDomainFilter] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control Framework Explorer"
        description="Browse security domains, individual controls, and the compliance frameworks they map to."
        badge={version?.version_label ? `SCF ${version.version_label}` : undefined}
      />

      {versionError ? (
        <ErrorState error={versionError} />
      ) : versionLoading ? (
        <Spinner />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 bg-muted/50">
            <TabsTrigger value="domains"><Layers className="w-4 h-4 mr-2" />Domains</TabsTrigger>
            <TabsTrigger value="controls"><ShieldCheck className="w-4 h-4 mr-2" />Controls</TabsTrigger>
            <TabsTrigger value="frameworks"><BookMarked className="w-4 h-4 mr-2" />Frameworks</TabsTrigger>
          </TabsList>

          <TabsContent value="domains" className="animate-slide-up">
            <DomainsTab versionId={versionId} />
          </TabsContent>

          <TabsContent value="controls" className="animate-slide-up">
            <ControlsTab
              versionId={versionId}
              domainCode={domainFilter}
              onClearDomain={() => setDomainFilter("")}
            />
          </TabsContent>

          <TabsContent value="frameworks" className="animate-slide-up">
            <FrameworksTab versionId={versionId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Future: custom standards upload */}
      <Card className="border-dashed border-border/60 shadow-none bg-muted/10">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <FileBox className="h-4 w-4" />
            Custom standards
          </CardTitle>
          <CardDescription>
            Coming in a future release: upload your own standards and frameworks to map
            them against the SCF catalog.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
