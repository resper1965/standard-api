import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { GapTable } from "../components/GapTable";
import type { GapFinding } from "../components/GapTable";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Loader2, AlertTriangle, Play, RefreshCw, CheckCircle2, Clock } from "lucide-react";

interface GapVersion {
  id: string;
  gap_analysis_version_id: string;
  status: string;
  created_at: string;
  soa_version_id?: string;
}

interface SoaVersion {
  id: string;
  soa_version_id: string;
  status: string;
}

export function GapAnalysisPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");

  const [findings, setFindings] = useState<GapFinding[]>([]);
  const [versions, setVersions] = useState<GapVersion[]>([]);
  const [soaVersions, setSoaVersions] = useState<SoaVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const versionsRes = await api<{ data: GapVersion[] }>(`/api/v1/assessments/${assessmentId}/gap-analysis`);
      const vlist = versionsRes.data || [];
      setVersions(vlist);

      if (vlist.length > 0) {
        const latestId = vlist[0].gap_analysis_version_id;
        setSelectedVersionId(latestId);
        const findingsRes = await api<{ data: GapFinding[] }>(`/api/v1/gap-analysis/${latestId}/findings`);
        setFindings(findingsRes.data || []);
      }

      // Best-effort: load SOA versions to pre-populate run form
      const soaRes = await api<{ data: SoaVersion[] }>(`/api/v1/assessments/${assessmentId}/soa`).catch(() => ({ data: [] as SoaVersion[] }));
      setSoaVersions(soaRes.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch gap analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [assessmentId]);

  const runGapAnalysis = async () => {
    if (!assessmentId) return;
    setRunning(true);
    setError(null);
    try {
      // Prefer the latest approved SOA version; fall back to the first available
      const soaVersionId =
        soaVersions.find(s => s.status === "approved")?.soa_version_id ||
        soaVersions[0]?.soa_version_id ||
        null;

      if (!soaVersionId) {
        setError("No SOA version available. Please complete a Statement of Applicability before running a gap analysis.");
        return;
      }

      await api(`/api/v1/assessments/${assessmentId}/gap-analysis/draft`, {
        method: "POST",
        body: JSON.stringify({ soa_version_id: soaVersionId }),
      });

      // Refresh to show the new draft
      await fetchVersions();
    } catch (e: any) {
      setError(e.message || "Failed to trigger gap analysis");
    } finally {
      setRunning(false);
    }
  };

  const getVersionStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "under_review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Gap Analysis"
        description="Identify control gaps and compliance shortfalls"
      >
        <div className="flex gap-2">
          {versions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="glass h-9"
              onClick={fetchVersions}
              disabled={loading || running}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          {assessmentId && (
            <Button
              size="sm"
              className="h-9 shadow-lg shadow-primary/20"
              onClick={runGapAnalysis}
              disabled={running || loading}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1.5" />
                  Run Gap Analysis
                </>
              )}
            </Button>
          )}
        </div>
      </PageHeader>

      {!assessmentId ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Select an assessment from the Assessments page to view its gap analysis.
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Version history strip */}
          {versions.length > 0 && (
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Analysis Versions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {versions.map((v, i) => (
                    <button
                      key={v.gap_analysis_version_id}
                      onClick={async () => {
                        setSelectedVersionId(v.gap_analysis_version_id);
                        setLoading(true);
                        try {
                          const res = await api<{ data: GapFinding[] }>(`/api/v1/gap-analysis/${v.gap_analysis_version_id}/findings`);
                          setFindings(res.data || []);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedVersionId === v.gap_analysis_version_id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-muted/40 hover:border-primary/40"
                      }`}
                    >
                      {v.status === "approved" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      Version {versions.length - i}
                      <Badge className={`ml-1 text-[10px] px-1.5 py-0 border ${getVersionStatusColor(v.status)}`}>
                        {v.status.replace(/_/g, " ")}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 shadow-none">
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/60 rounded-lg text-center">
                  <Play className="h-8 w-8 text-muted-foreground opacity-30 mb-4" />
                  <p className="text-sm font-medium mb-1">No gap analysis run yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Click "Run Gap Analysis" to identify control gaps against your SOA.
                  </p>
                  <Button size="sm" onClick={runGapAnalysis} disabled={running}>
                    {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                    Run Gap Analysis
                  </Button>
                </div>
              ) : (
                <GapTable findings={findings} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
