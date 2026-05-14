import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { GapTable } from "../components/GapTable";
import type { GapFinding } from "../components/GapTable";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";

export function GapAnalysisPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  
  const [findings, setFindings] = useState<GapFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGapAnalysis = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const versionsRes = await api<{ data: { id: string }[] }>(`/api/v1/assessments/${assessmentId}/gap-analysis`);
      const versions = versionsRes.data || [];
      if (versions.length > 0) {
        const latestVersionId = versions[0].id;
        const findingsRes = await api<{ data: GapFinding[] }>(`/api/v1/gap-analysis/${latestVersionId}/findings`);
        setFindings(findingsRes.data || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch gap analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
  }, [assessmentId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gap Analysis"
        description="Identify control gaps and compliance shortfalls"
      />

      {!assessmentId ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Select an assessment from the Assessments page to view its gap analysis.
        </div>
      ) : (
        <Card className="border-border/60 shadow-none">
          <CardContent className="pt-6">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
