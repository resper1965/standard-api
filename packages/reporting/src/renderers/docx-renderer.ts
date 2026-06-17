import { zipSync, strToU8 } from "fflate";
import type { ReportSectionResponse } from "@standard/schemas";
import type { RenderedReportArtifact } from "../types";

export function renderDocxArtifact(
  title: string,
  reportVersionId: string,
  sections: ReportSectionResponse[],
): RenderedReportArtifact {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat/>
</w:settings>`;

  // level:0 stores files verbatim (no compression), keeping XML text intact in the ZIP binary
  const zipBytes = zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "word/document.xml": strToU8(buildDocumentXml(title, sections)),
      "word/_rels/document.xml.rels": strToU8(documentRels),
      "word/settings.xml": strToU8(settings),
    },
    { level: 0 },
  );

  return {
    artifact_type: "report",
    format: "docx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content: uint8ArrayToBase64(zipBytes),
  };
}

function buildDocumentXml(
  title: string,
  sections: ReportSectionResponse[],
): string {
  const paragraphs: string[] = [];

  paragraphs.push(heading(title, 1));
  paragraphs.push(emptyParagraph());

  for (const section of sections) {
    paragraphs.push(heading(section.title, 2));

    const rawContent = section.content;
    if (rawContent) {
      const text =
        typeof rawContent === "string"
          ? rawContent
          : JSON.stringify(rawContent);
      const lines = text.split("\n");
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

