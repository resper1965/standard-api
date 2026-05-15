import type { ReportSectionResponse } from "@standard/schemas";
import type { RenderedReportArtifact } from "../types";

/**
 * DOCX Renderer — generates a real DOCX document body from report sections.
 *
 * Uses Markdown content as the source and produces Office Open XML.
 * For Cloudflare Workers compatibility, generates XML directly.
 */
export function renderDocxArtifact(
  title: string,
  reportVersionId: string,
  sections: ReportSectionResponse[]
): RenderedReportArtifact {
  const docXml = buildDocumentXml(title, sections);

  // Encode as base64 for transport
  const encoder = new TextEncoder();
  const bytes = encoder.encode(docXml);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const content = btoa(binary);

  return {
    artifact_type: "report",
    format: "docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content,
  };
}

function buildDocumentXml(title: string, sections: ReportSectionResponse[]): string {
  const paragraphs: string[] = [];

  paragraphs.push(heading(title, 1));
  paragraphs.push(emptyParagraph());

  for (const section of sections) {
    paragraphs.push(heading(section.title, 2));

    if (section.content) {
      const lines = section.content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          paragraphs.push(heading(trimmed.replace(/^##\s*/, ""), 3));
        } else if (trimmed.startsWith("# ")) {
          paragraphs.push(heading(trimmed.replace(/^#\s*/, ""), 2));
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          paragraphs.push(bulletItem(trimmed.replace(/^[-*]\s*/, "")));
        } else if (trimmed.length > 0) {
          paragraphs.push(paragraph(trimmed));
        }
      }
    }

    paragraphs.push(emptyParagraph());
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n    ")}
  </w:body>
</w:document>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function heading(text: string, level: number): string {
  const styleId = level === 1 ? "Title" : level === 2 ? "Heading1" : "Heading2";
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function paragraph(text: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function emptyParagraph(): string {
  return `<w:p/>`;
}

function bulletItem(text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}
