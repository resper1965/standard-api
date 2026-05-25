import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { API_URL } from "../lib/config";
import { PageHeader } from "../components/PageHeader";
import { FileUpload } from "../components/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { Loader2, AlertTriangle, Upload, FileText, ClipboardCopy } from "lucide-react";

interface DocumentRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  title: string;
  hash: string;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
}

const statusVariant: Record<string, "success" | "warning" | "info" | "muted"> = {
  processed: "success",
  ingested: "success",
  uploaded: "info",
  pending: "warning",
  failed: "muted",
};

export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyAsMarkdown = () => {
    const now = new Date().toISOString();
    const lines: string[] = [
      `# Documents — Standard GRC`,
      ``,
      `> Snapshot: ${now}`,
      `> Assessment: ${assessmentId ?? "(none)"}`,
      `> URL: ${window.location.href}`,
      ``,
    ];

    if (documents.length === 0) {
      lines.push(`_No documents uploaded yet._`);
    } else {
      lines.push(`| # | Title | Status | Uploaded |`);
      lines.push(`|---|-------|--------|----------|`);
      documents.forEach((doc, i) => {
        const date = new Date(doc.uploaded_at || Date.now()).toLocaleDateString();
        lines.push(`| ${i + 1} | ${doc.title} | ${doc.status} | ${date} |`);
      });
      lines.push(``);
      lines.push(`**Total: ${documents.length} file(s)**`);
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchDocuments = async () => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ data: DocumentRecord[] }>(`/api/v1/assessments/${assessmentId}/documents`);
      setDocuments(res?.data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [assessmentId]);

  const handleUpload = async (file: File) => {
    if (!assessmentId) {
      setError("Please select an assessment before uploading.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await fetch(`${API_URL}/api/v1/assessments/${assessmentId}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      await fetchDocuments();
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <PageHeader title="Documents" description="Upload, manage, and track compliance evidence files" />
        <button
          onClick={copyAsMarkdown}
          className="btn flex items-center gap-2 text-sm"
          title="Copy page as Markdown to clipboard"
        >
          <ClipboardCopy className="h-4 w-4" />
          {copied ? "Copied!" : "Copy as MD"}
        </button>
      </div>
      {!assessmentId && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Navigate to a specific assessment to upload documents.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {assessmentId && (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onUpload={handleUpload} />
            {uploading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading and scanning for malware...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Document Library</CardTitle>
            <span className="text-xs text-muted-foreground">{documents.length} files</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No documents found"
              description="Upload evidence files to start your compliance documentation."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[doc.status] || "muted"}>
                        {doc.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
