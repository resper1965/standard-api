import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { GapTable } from "../components/GapTable";
import type { GapFinding } from "../components/GapTable";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AssessmentSelector } from "../components/AssessmentSelector";
import { useActiveAssessment } from "../hooks/use-active-assessment";
import { Loader2, Play } from "lucide-react";

interface GapVersion {
  id: string;
  created_at?: string;
}

export function GapAnalysisPage() {
  const { assessmentId } = useActiveAssessment();

  const [findings, setFindings] = useState<GapFinding[]>([]);
  const [versions, setVersions] = useState<GapVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGapAnalysis = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const versionsRes = await api<{ data: GapVersion[] }>(`/api/v1/assessments/${assessmentId}/gap-analysis`);
      const versionList = versionsRes.data || [];
      setVersions(versionList);
      if (versionList.length > 0) {
        const latestVersionId = versionList[0].id;
        const findingsRes = await api<{ data: GapFinding[] }>(`/api/v1/gap-analysis/${latestVersionId}/findings`);
        setFindings(findingsRes.data || []);
      } else {
        setFindings([]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch gap analysis");
    } finally {
      setLoading(false);
    }
  };

  const runGapAnalysis = async () => {
    if (!assessmentId) return;
    setRunning(true);
    setError(null);
    try {
      await api(`/api/v1/assessments/${assessmentId}/gap-analysis/draft`, { method: "POST" });
      await fetchGapAnalysis();
    } catch (e: any) {
      setError(e.message || "Failed to run gap analysis");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
  }, [assessmentId]);

  const versionLabel = versions.length > 0
    ? `${versions.length} version${versions.length !== 1 ? "s" : ""} — Identify control gaps and compliance shortfalls`
    : "Identify control gaps and compliance shortfalls";

  return (
    <div className="space-y-6">

      {!assessmentId ? (
        <AssessmentSelector label="Gap Analysis" />
      ) : (
        <Card className="border-border/60 shadow-none">
          <CardContent className="pt-6">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                {error}
              </div>
            )}
            {loading || running ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                {running && (
                  <p className="text-sm text-muted-foreground">Running gap analysis, please wait…</p>
                )}
              </div>
            ) : (
              <GapTable findings={findings} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
