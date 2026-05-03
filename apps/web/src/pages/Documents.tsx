import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { FileUpload } from "../components/FileUpload";

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
      setDocuments(res.data);
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
      // In a real implementation we would get a presigned URL then upload to R2
      // For MVP we just hit the gateway (if it supports direct upload)
      // Standard fetch FormData for simple files:
      const formData = new FormData();
      formData.append("file", file);
      
      const API_BASE = import.meta.env.PROD ? "https://aegis-api.bekaa.eu" : "";
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
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">Upload and manage assessment evidence</p>
      </div>

      {!assessmentId && (
        <div className="card" style={{ marginBottom: "24px", color: "var(--warning)" }}>
          <p>You are viewing all documents. To upload, please navigate to a specific assessment first.</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginBottom: "24px", color: "#ef4444", border: "1px solid #ef4444" }}>
          {error}
        </div>
      )}

      {assessmentId && (
        <div style={{ marginBottom: "32px" }}>
          <FileUpload onUpload={handleUpload} />
          {uploading && <p style={{ marginTop: "8px", color: "var(--text-muted)" }}>Uploading...</p>}
        </div>
      )}

      <div className="card">
        <h2>Document Library</h2>
        {loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No documents found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Title</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid var(--border)" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="table-row">
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>{doc.title}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`badge ${doc.status === "processed" || doc.status === "ingested" ? "badge-success" : "badge-warning"}`}>
                        {doc.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                      {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
