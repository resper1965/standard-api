import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Loader2, Search, Shield, Layers } from "lucide-react";

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

export function ScfCatalogPage() {
  const [version, setVersion] = useState<ScfVersion | null>(null);
  const [domains, setDomains] = useState<ScfDomain[]>([]);
  const [controls, setControls] = useState<ScfControl[]>([]);
  const [frameworks, setFrameworks] = useState<ScfFramework[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"controls" | "frameworks">("controls");

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

  const filtered = controls.filter((c) => {
    const matchesDomain = !activeDomain || c.control_code.startsWith(activeDomain);
    const matchesSearch =
      !search ||
      c.control_code.toLowerCase().includes(search.toLowerCase()) ||
      c.control_title.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="SCF Catalog"
        description={version
          ? `Version ${version.version_label} · ${controls.length} controls · ${frameworks.length} frameworks · ${domains.length} domains`
          : "No SCF version loaded"}
      />

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={tab === "controls" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("controls")}
          className="text-xs"
        >
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Controls ({controls.length})
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
                className="pl-9"
              />
            </div>
            <select
              value={activeDomain ?? ""}
              onChange={(e) => setActiveDomain(e.target.value || null)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">All Domains ({domains.length})</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain_code}>
                  {d.domain_code} — {d.domain_name}
                </option>
              ))}
            </select>
          </div>

          <Card className="border-border/60 shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        No controls found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.control_id}>
                        <TableCell className="font-semibold text-primary font-mono text-xs">
                          {c.control_code}
                        </TableCell>
                        <TableCell className="text-sm">{c.control_title}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success">
                            {c.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "frameworks" && (
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frameworks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No frameworks loaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  frameworks.map((f) => (
                    <TableRow key={f.framework_id || (f as any).id}>
                      <TableCell className="font-semibold text-primary font-mono text-xs">
                        {f.framework_code || (f as any).framework_id}
                      </TableCell>
                      <TableCell className="text-sm">{f.framework_name || (f as any).name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{f.publisher ?? "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success">
                          {f.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
