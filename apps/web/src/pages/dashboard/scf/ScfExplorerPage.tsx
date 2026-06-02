import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useMemo } from "react";
import {
  useScfLatestVersion,
  useScfDomains,
  useScfControls,
  useScfFrameworks,
  useScfFrameworkCoverage,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Layers, ShieldCheck, BookMarked, Search, Loader2, AlertCircle,
  X, FileBox, ExternalLink,
} from "lucide-react";

// ─── Types (mirror queries.ts response shapes) ──────────────────────────────────

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

// ─── Small helpers ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, label }: { icon: typeof Layers; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm flex items-center gap-2">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error instanceof Error ? error.message : "Failed to load SCF data."}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Domains Tab ─────────────────────────────────────────────────────────────────

function DomainsTab({
  versionId,
  onDomainClick,
}: {
  versionId?: string;
  onDomainClick: (code: string) => void;
}) {
  const { data, isLoading, error } = useScfDomains(versionId);
  const domains = (data?.data ?? []) as ScfDomain[];

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} />;
  if (domains.length === 0) return <EmptyState icon={Layers} label="No domains found." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {domains.map((d) => (
        <Card
          key={d.id}
          className="border-border/60 shadow-none hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => onDomainClick(d.domain_code)}
        >
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">{d.domain_code}</Badge>
            </div>
            <p className="text-sm font-medium leading-snug">{d.domain_name}</p>
            {d.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
            )}
            <p className="text-[11px] text-primary/70 pt-1 flex items-center gap-1">
              View controls <ExternalLink className="h-2.5 w-2.5" />
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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

      {/* Active filters */}
      {(domainCode || query) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {domainCode && (
            <Badge variant="muted" className="gap-1">
              Domain: {domainCode}
              <button onClick={onClearDomain} className="hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {query && (
            <Badge variant="muted" className="gap-1">
              "{query}"
              <button onClick={() => { setQuery(""); setSearchInput(""); }} className="hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} />
      ) : controls.length === 0 ? (
        <EmptyState icon={ShieldCheck} label="No controls match your filters." />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{controls.length} control{controls.length !== 1 ? "s" : ""}</p>
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card divide-y divide-border/30">
            {controls.map((c) => (
              <button
                key={c.control_id}
                onClick={() => setSelected(c)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <Badge variant="outline" className="font-mono text-[10px] shrink-0 mt-0.5">{c.control_code}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.control_title}</p>
                  {c.control_description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.control_description}</p>
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
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">{selected?.control_code}</Badge>
              {selected?.control_title}
            </DialogTitle>
            <DialogDescription className="sr-only">SCF control detail</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              {selected.control_description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selected.control_description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="muted" className="text-[10px] capitalize">{selected.status}</Badge>
              </div>
              <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Control ID</p>
                <p className="font-mono text-xs text-muted-foreground break-all select-all">{selected.control_id}</p>
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
  if (isLoading) return <span className="text-[11px] text-muted-foreground">Loading…</span>;
  if (!data) return null;
  const pct = data.requirement_count > 0
    ? Math.round((data.mapped_requirement_count / data.requirement_count) * 100)
    : 0;
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span>{data.requirement_count} reqs</span>
      <span>·</span>
      <span>{data.control_count} controls</span>
      <span>·</span>
      <span className="text-primary font-medium">{pct}% mapped</span>
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search frameworks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookMarked} label="No frameworks match your search." />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} framework{filtered.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((f) => (
              <Card key={f.framework_id} className="border-border/60 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{f.framework_name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px]">{f.framework_code}</Badge>
                        {f.framework_version && (
                          <span className="text-[10px] text-muted-foreground">v{f.framework_version}</span>
                        )}
                      </div>
                    </div>
                    {f.category && (
                      <Badge variant="muted" className="text-[9px] shrink-0 capitalize">{f.category}</Badge>
                    )}
                  </div>
                  {(f.publisher || f.jurisdiction) && (
                    <p className="text-xs text-muted-foreground">
                      {[f.publisher, f.jurisdiction].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <FrameworkCoverage frameworkId={f.framework_id} versionId={versionId} />
                </CardContent>
              </Card>
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

  const goToControlsByDomain = (code: string) => {
    setDomainFilter(code);
    setTab("controls");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Browse the Secure Controls Framework catalog — security domains, individual
            controls, and the compliance frameworks they map to.
          </p>
        </div>
        {version && (
          <Badge variant="outline" className="gap-1.5 shrink-0">
            <FileBox className="h-3 w-3" />
            SCF {version.version_label}
          </Badge>
        )}
      </div>

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

          <TabsContent value="domains">
            <DomainsTab versionId={versionId} onDomainClick={goToControlsByDomain} />
          </TabsContent>

          <TabsContent value="controls">
            <ControlsTab
              versionId={versionId}
              domainCode={domainFilter}
              onClearDomain={() => setDomainFilter("")}
            />
          </TabsContent>

          <TabsContent value="frameworks">
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
