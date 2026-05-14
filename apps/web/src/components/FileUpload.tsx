import { useState, useRef } from "react";
import type { ChangeEvent, DragEvent } from "react";

export function FileUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <form onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
      <input 
        ref={inputRef} 
        type="file" 
        multiple={false} 
        onChange={handleChange} 
        style={{ display: "none" }} 
        accept=".pdf,.docx,.doc,.txt" 
      />
      <div 
        className={`card ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop}
        style={{ 
          border: dragActive ? "2px dashed var(--accent)" : "2px dashed var(--border)", 
          textAlign: "center", 
          padding: "48px 24px",
          cursor: "pointer",
          backgroundColor: dragActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
          transition: "all 0.2s ease"
        }}
        onClick={() => inputRef.current?.click()}
      >
        <span style={{ fontSize: "2rem", display: "block", marginBottom: "16px" }}>📄</span>
        <p style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: "bold" }}>Drag and drop your file here</p>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>or click to browse from your computer (PDF, DOCX, TXT)</p>
      </div>
    </form>
  );
}
