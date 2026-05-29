import { useEffect, useState, useMemo } from "react";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Pagination } from "../components/ui/pagination";
import { Skeleton } from "../components/ui/skeleton";
import { Search, Shield, Layers, Copy, Check } from "lucide-react";

const PAGE_SIZE = 50;

type ScfVersion = {
  scf_version_id: string;
  version_label: string;
  release_date?: string;
  is_synthetic: boolean;
};

type ScfDomain = {
  id: string;
  domain_code: string;
  domain_name: string;
  description?: string;
  sort_order: number;
};

type ScfControl = {
  control_id: string;
  control_code: string;
  control_title: string;
  control_description?: string;
  status: string;
};

type ScfFramework = {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  publisher?: string;
  status: string;
};

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-semibold text-primary font-mono text-xs group/code"
      title="Copy code"
    >
      {code}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover/code:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

export function ScfCatalogPage() {
  const [version, setVersion] = useState<ScfVersion | null>(null);
  const [domains, setDomains] = useState<ScfDomain[]>([]);
  const [controls, setControls] = useState<ScfControl[]>([]);
  const [frameworks, setFrameworks] = useState<ScfFramework[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"controls" | "frameworks">("controls");
  const [controlPage, setControlPage] = useState(1);
  const [frameworkPage, setFrameworkPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const v = await api<ScfVersion>("/api/v1/scf/versions/latest");
        setVersion(v);
        const [d, c, f] = await Promise.all([
          api<{ data: ScfDomain[] }>(`/api/v1/scf/versions/${v.scf_version_id}/domains`),
          api<{ data: ScfControl[] }>(`/api/v1/scf/versions/${v.scf_version_id}/controls`),
          api<{ data: ScfFramework[] }>("/api/v1/scf/frameworks"),
        ]);
        setDomains(d?.data ?? []);
        setControls(c?.data ?? []);
        setFrameworks(f?.data ?? []);
      } catch {
        // SCF not loaded — show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return controls.filter((c) => {
      const matchesDomain = !activeDomain || c.control_code.startsWith(activeDomain);
      const matchesSearch =
        !search ||
        c.control_code.toLowerCase().includes(search.toLowerCase()) ||
        c.control_title.toLowerCase().includes(search.toLowerCase());
      return matchesDomain && matchesSearch;
    });
  }, [controls, activeDomain, search]);

  // Reset page when filters change
  useEffect(() => { setControlPage(1); }, [search, activeDomain]);

  const controlTotalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedControls = filtered.slice((controlPage - 1) * PAGE_SIZE, controlPage * PAGE_SIZE);

  const frameworkTotalPages = Math.ceil(frameworks.length / PAGE_SIZE);
  const paginatedFrameworks = frameworks.slice((frameworkPage - 1) * PAGE_SIZE, frameworkPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={tab === "controls" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("controls")}
          className="text-xs"
        >
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Controls ({controls.length.toLocaleString()})
        </Button>
        <Button
          variant={tab === "frameworks" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("frameworks")}
          className="text-xs"
        >
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Frameworks ({frameworks.length})
        </Button>
      </div>

      {tab === "controls" && (
        <>
          {/* Search + domain filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search controls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 bg-white/5 border-white/10 text-foreground rounded-xl focus-visible:ring-primary/50"
              />
            </div>
            <select
              value={activeDomain ?? ""}
              onChange={(e) => setActiveDomain(e.target.value || null)}
              className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-md"
            >
              <option value="" className="bg-background">All Domains ({domains.length})</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain_code} className="bg-background">
                  {d.domain_code} — {d.domain_name}
                </option>
              ))}
            </select>
          </div>

          <div className="glass-premium rounded-3xl overflow-hidden border-border/20">
            <div className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/5 dark:bg-white/5 border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[140px] py-4 px-6 font-semibold uppercase tracking-wider text-xs">Code</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Title</TableHead>
                    <TableHead className="w-[100px] font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedControls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-32">
                        No controls found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedControls.map((c) => (
                      <TableRow key={c.control_id} className="group hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/5 transition-colors">
                        <TableCell className="py-4 px-6">
                          <CopyCode code={c.control_code} />
                        </TableCell>
                        <TableCell className="text-sm py-4">{c.control_title}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filtered.length > PAGE_SIZE && (
                <div className="px-6 py-4 border-t border-white/5">
                  <Pagination
                    currentPage={controlPage}
                    totalPages={controlTotalPages}
                    totalItems={filtered.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setControlPage}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "frameworks" && (
        <div className="glass-premium rounded-3xl overflow-hidden border-border/20">
          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/5 dark:bg-white/5 border-b border-white/5">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[160px] py-4 px-6 font-semibold uppercase tracking-wider text-xs">Code</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-xs">Name</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-xs">Publisher</TableHead>
                  <TableHead className="w-[100px] font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFrameworks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No frameworks loaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFrameworks.map((f) => (
                    <TableRow key={f.framework_id || (f as any).id}>
                      <TableCell>
                        <CopyCode code={f.framework_code || (f as any).framework_id} />
                      </TableCell>
                      <TableCell className="text-sm">{f.framework_name || (f as any).name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{f.publisher ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="success">{f.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {frameworks.length > PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-white/5">
                <Pagination
                  currentPage={frameworkPage}
                  totalPages={frameworkTotalPages}
                  totalItems={frameworks.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setFrameworkPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

