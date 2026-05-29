import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { AssessmentSelector } from "../components/AssessmentSelector";
import { useActiveAssessment } from "../hooks/use-active-assessment";
import { Loader2, FileDown, Plus } from "lucide-react";

interface ReportVersion {
  id: string;
  report_version_id: string;
  report_type: string;
  status: string;
  created_at: string;
}

export function ReportsPage() {
  const { assessmentId } = useActiveAssessment();

  const [reports, setReports] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: ReportVersion[] }>(`/api/v1/assessments/${assessmentId}/reports`);
      setReports(res.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [assessmentId]);

  const generateReport = async () => {
    if (!assessmentId) return;
    setGenerating(true);
    setError(null);
    try {
      await api(`/api/v1/assessments/${assessmentId}/reports/draft`, {
        method: "POST",
        body: JSON.stringify({
          report_type: "full_assessment_report",
          options: { include_evidence: true }
        })
      });
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportVersionId: string, format: "pdf" | "docx" | "markdown" | "json" = "markdown") => {
    if (!assessmentId) return;
    const downloadKey = `${reportVersionId}_${format}`;
    setDownloading(downloadKey);
    setError(null);
    try {
      // Step 1: POST to trigger artifact generation
      const exportRes = await api<any>(
        `/api/v1/reports/${reportVersionId}/exports/${format}`,
        { method: "POST" }
      );
      const artifactId = exportRes?.report_artifact_id || exportRes?.data?.report_artifact_id;
      if (!artifactId) {
        throw new Error(`Failed to generate ${format.toUpperCase()} export.`);
      }

      // Step 2: GET the download URL of the generated artifact
      const dlRes = await api<{ download_url: string }>(
        `/api/v1/report-artifacts/${artifactId}/download-url`
      );
      const url = dlRes?.download_url || (dlRes as any)?.data?.download_url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setError(`Download URL not available for ${format.toUpperCase()} export.`);
      }
    } catch (e: any) {
      setError(e.message || `Failed to download report as ${format.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">

      {!assessmentId ? (
        <AssessmentSelector label="Reports" />
      ) : (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border/60 rounded-lg">
                No reports generated yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r, i) => (
                    <TableRow key={r.report_version_id || i}>
                      <TableCell className="font-medium capitalize">
                        {r.report_type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.status === "approved" || r.status === "final"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReport(r.report_version_id, "pdf")}
                            disabled={!!downloading}
                          >
                            {downloading === `${r.report_version_id}_pdf` ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <FileDown className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReport(r.report_version_id, "docx")}
                            disabled={!!downloading}
                          >
                            {downloading === `${r.report_version_id}_docx` ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <FileDown className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            DOCX
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReport(r.report_version_id, "markdown")}
                            disabled={!!downloading}
                          >
                            {downloading === `${r.report_version_id}_markdown` ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <FileDown className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Markdown
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
