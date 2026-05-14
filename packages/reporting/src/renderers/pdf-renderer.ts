/**
 * PDF Renderer for Standard GRC Reports
 *
 * Generates a structured HTML document optimized for PDF printing.
 * On Cloudflare Workers, the HTML is returned for client-side PDF conversion
 * via `window.print()` or downstream server-side rendering (Puppeteer/Playwright).
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
  .toc { page-break-after: always; }
  .toc h2 { border-bottom: none; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 0.3em 0; border-bottom: 1px dotted #ccc; }
  .toc li a { text-decoration: none; color: #16213e; }
  .section { page-break-inside: avoid; }
  .severity-critical { color: #dc2626; font-weight: 600; }
  .severity-high { color: #ea580c; font-weight: 600; }
  .severity-medium { color: #d97706; }
  .severity-low { color: #65a30d; }
  .badge-pass { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .badge-fail { background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .badge-partial { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
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

/**
 * Render a full assessment report as print-ready HTML.
 *
 * The output is a complete HTML document with:
 * - Cover page with title, version ID, and generation timestamp
 * - Table of contents with links to each section
 * - All report sections rendered as tables
 * - Print-optimized CSS (A4 page size, page breaks, fixed footer)
 *
 * For true PDF binary output, pipe through Puppeteer/Playwright:
 * ```
 * const browser = await puppeteer.launch();
 * const page = await browser.newPage();
 * await page.setContent(artifact.content);
 * const pdfBuffer = await page.pdf({ format: 'A4' });
 * ```
 */
export const renderPdfArtifact = (
  title: string,
  reportVersionId: string,
  sections: ReportSectionResponse[],
  locale: SupportedLocale = "pt-BR"
): RenderedReportArtifact => {
  const labels = getReportLabels(locale);
  const now = new Date().toISOString();

  // Table of Contents
  const tocItems = sections.map((section, i) =>
    `<li><a href="#section-${i}">${escapeHtml(section.title)}</a></li>`
  ).join("\n");

  const tocHtml = `
    <div class="toc">
      <h2>${locale === "pt-BR" ? "Índice" : "Table of Contents"}</h2>
      <ul>${tocItems}</ul>
    </div>
  `;

  // Sections
  const sectionsHtml = sections.map((section, i) => `
    <div class="section" id="section-${i}">
      <h2>${escapeHtml(section.title)}</h2>
      ${renderSectionContent(section.content)}
    </div>
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

  ${tocHtml}

  ${sectionsHtml}

  <div class="footer">
    Standard GRC Platform — ${labels.reportVersion} ${escapeHtml(reportVersionId)} — ${now}
  </div>
</body>
</html>`;

  return {
    artifact_type: "report",
    format: "pdf",
    mime_type: "text/html", // Print-ready HTML — convert to PDF via browser print or Puppeteer
    content: html,
  };
};
