/**
 * PDF Renderer for Standard GRC Reports
 *
 * Generates a structured HTML document optimized for PDF printing.
 * On Cloudflare Workers, the HTML is returned for client-side PDF conversion.
 * For server-side PDF, consumers can pipe this through puppeteer/playwright.
 *
 * Edge-compatible: zero native dependencies.
 */
import type { ReportSectionResponse, SupportedLocale } from "@standard/schemas";
import { getReportLabels } from "./markdown-renderer";
import type { RenderedReportArtifact } from "../types";

const CSS = `
  @page { margin: 2cm; size: A4; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 210mm;
    margin: 0 auto;
    padding: 2cm;
  }
  .cover {
    text-align: center;
    margin-top: 30%;
    page-break-after: always;
  }
  .cover h1 {
    font-size: 28pt;
    color: #16213e;
    margin-bottom: 0.5em;
  }
  .cover .subtitle {
    font-size: 14pt;
    color: #0f3460;
  }
  .cover .meta {
    margin-top: 2em;
    font-size: 10pt;
    color: #666;
  }
  h2 {
    color: #16213e;
    border-bottom: 2px solid #e94560;
    padding-bottom: 0.3em;
    margin-top: 1.5em;
    page-break-after: avoid;
  }
  h3 { color: #0f3460; margin-top: 1.2em; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  th { background: #16213e; color: white; }
  tr:nth-child(even) { background: #f8f9fa; }
  .footer {
    position: fixed;
    bottom: 1cm;
    left: 2cm;
    right: 2cm;
    font-size: 8pt;
    color: #999;
    border-top: 1px solid #eee;
    padding-top: 0.3em;
    text-align: center;
  }
  .badge-pass { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .badge-fail { background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .badge-partial { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
`;

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderSectionContent = (content: Record<string, unknown>): string => {
  const rows = Object.entries(content).map(([key, value]) => {
    const displayValue = typeof value === "string" ? escapeHtml(value) : escapeHtml(JSON.stringify(value, null, 2));
    return `<tr><td><strong>${escapeHtml(key)}</strong></td><td>${displayValue}</td></tr>`;
  });
  return `<table><tbody>${rows.join("")}</tbody></table>`;
};

export const renderPdfArtifact = (
  title: string,
  reportVersionId: string,
  sections: ReportSectionResponse[],
  locale: SupportedLocale = "pt-BR"
): RenderedReportArtifact => {
  const labels = getReportLabels(locale);
  const now = new Date().toISOString();

  const sectionsHtml = sections.map((section) => `
    <h2>${escapeHtml(section.title)}</h2>
    ${renderSectionContent(section.content)}
  `).join("\n");

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <h1>🛡️ ${escapeHtml(title)}</h1>
    <p class="subtitle">Standard GRC Platform</p>
    <p class="meta">
      ${labels.reportVersion}: ${escapeHtml(reportVersionId)}<br />
      ${labels.generatedAt}: ${now}
    </p>
  </div>

  ${sectionsHtml}

  <div class="footer">
    Standard GRC Platform — ${labels.reportVersion} ${escapeHtml(reportVersionId)} — ${now}
  </div>
</body>
</html>`;

  return {
    artifact_type: "report",
    format: "pdf",
    mime_type: "text/html", // HTML optimized for print-to-PDF
    content: html,
  };
};
