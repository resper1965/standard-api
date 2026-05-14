import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { FileUpload } from "../components/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Loader2, AlertTriangle, Upload } from "lucide-react";

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

export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      const API_BASE = import.meta.env.PROD ? "https://api.standard.bekaa.eu" : "";
      await fetch(`${API_BASE}/api/v1/assessments/${assessmentId}/documents/upload`, {
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
    <div className="space-y-6">
      {!assessmentId && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
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
            {uploading && <p className="mt-3 text-sm text-muted-foreground">Uploading and scanning for malware...</p>}
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border/60 rounded-lg">
              No documents found.
            </div>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        doc.status === "processed" || doc.status === "ingested"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {doc.status.replace(/_/g, " ")}
                      </span>
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
