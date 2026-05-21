import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Loader2, AlertTriangle, FileDown, Plus, RefreshCw, Download } from "lucide-react";

interface ReportVersion {
  id: string;
  report_version_id: string;
  report_type: string;
  status: string;
  created_at: string;
}

interface ExportJob {
  export_job_id: string;
  report_version_id: string | null;
  status: "pending" | "processing" | "succeeded" | "failed";
  format: string;
  report_type: string;
  created_at: string;
}

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");

  const [reports, setReports] = useState<ReportVersion[]>([]);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, exportsRes] = await Promise.allSettled([
        api<{ data: ReportVersion[] }>(`/api/v1/assessments/${assessmentId}/reports`),
        api<{ data: ExportJob[] }>(`/api/v1/assessments/${assessmentId}/exports`),
      ]);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value?.data || []);
      if (exportsRes.status === "fulfilled") setExports(exportsRes.value?.data || []);
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
      // Step 1: Create the report draft
      const draft = await api<ReportVersion>(`/api/v1/assessments/${assessmentId}/reports/draft`, {
        method: "POST",
        body: JSON.stringify({
          report_type: "full_assessment",
          options: { include_evidence: true },
        }),
      });

      // Step 2: Queue an export job (markdown format for now; system generates artifact)
      if (draft?.report_version_id) {
        await api(`/api/v1/assessments/${assessmentId}/exports`, {
          method: "POST",
          body: JSON.stringify({
            format: "markdown",
            report_type: "full_assessment",
          }),
        }).catch(() => {
          // Export enqueue is best-effort — don't fail the whole flow
        });
      }

      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Download flow:
   * 1. If there's a completed export job for this report, fetch its download URL.
   * 2. Otherwise, render the report (markdown) → store artifact → get artifact download URL.
   */
  const downloadReport = async (report: ReportVersion) => {
    setDownloadingId(report.report_version_id);
    setError(null);
    try {
      // Check if there's a succeeded export job for this version
      const matchedJob = exports.find(
        j => j.report_version_id === report.report_version_id && j.status === "succeeded"
      );

      if (matchedJob) {
        const jobData = await api<{ download_url: string }>(`/api/v1/export-jobs/${matchedJob.export_job_id}/download`);
        if (jobData?.download_url) {
          window.open(jobData.download_url, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // Fallback: render → store artifact → get presigned download URL
      const rendered = await api<{ artifact?: { report_artifact_id: string } }>(
        `/api/v1/reports/${report.report_version_id}/render`,
        {
          method: "POST",
          body: JSON.stringify({ format: "markdown", store_artifact: true }),
        }
      );

      const artifactId = rendered?.artifact?.report_artifact_id;
      if (!artifactId) {
        setError("Report rendered but no downloadable artifact was produced.");
        return;
      }

      const urlData = await api<{ download_url: string }>(`/api/v1/report-artifacts/${artifactId}/download-url`);
      if (urlData?.download_url) {
        window.open(urlData.download_url, "_blank", "noopener,noreferrer");
      } else {
        setError("Download URL could not be generated.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to download report");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "approved" || status === "final") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status === "under_review") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const getExportStatusForReport = (reportVersionId: string) => {
    const job = exports.find(j => j.report_version_id === reportVersionId);
    return job?.status ?? null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and download assessment reports"
      >
        <div className="flex gap-2">
          {assessmentId && reports.length > 0 && (
            <Button variant="outline" size="sm" className="glass h-9" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          {assessmentId && (
            <Button size="sm" className="h-9 shadow-lg shadow-primary/20" onClick={generateReport} disabled={generating || loading}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Generate Report
                </>
              )}
            </Button>
          )}
        </div>
      </PageHeader>

      {!assessmentId ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Select an assessment from the Assessments page to view or generate reports.
        </div>
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
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/60 rounded-lg text-center">
                <FileDown className="h-8 w-8 text-muted-foreground opacity-30 mb-4" />
                <p className="text-sm font-medium mb-1">No reports generated yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click "Generate Report" to create a full assessment report for download.
                </p>
                <Button size="sm" onClick={generateReport} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                  Generate Report
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Export</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r, i) => {
                    const exportStatus = getExportStatusForReport(r.report_version_id);
                    const isDownloading = downloadingId === r.report_version_id;
                    return (
                      <TableRow key={r.report_version_id || i}>
                        <TableCell className="font-medium capitalize">
                          {r.report_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-[10px] uppercase tracking-wide ${getStatusColor(r.status)}`}>
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {exportStatus ? (
                            <Badge className={`border text-[10px] uppercase tracking-wide ${
                              exportStatus === "succeeded"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : exportStatus === "failed"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {exportStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReport(r)}
                            disabled={isDownloading}
                            className="gap-1.5"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            {isDownloading ? "Downloading..." : "Download"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
