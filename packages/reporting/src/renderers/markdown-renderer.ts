// @ts-nocheck -- Zod v4 CI type compat
import type { ReportSectionResponse, SupportedLocale } from "@standard/schemas";
import type { RenderedReportArtifact } from "../types";

const LABELS: Record<SupportedLocale, {
  reportVersion: string;
  generatedAt: string;
  executiveSummary: string;
  findings: string;
  recommendations: string;
  appendix: string;
}> = {
  "pt-BR": {
    reportVersion: "VersÃ£o do relatÃ³rio",
    generatedAt: "Gerado em",
    executiveSummary: "Resumo Executivo",
    findings: "Achados",
    recommendations: "RecomendaÃ§Ãµes",
    appendix: "ApÃªndice",
  },
  "en": {
    reportVersion: "Report version",
    generatedAt: "Generated at",
    executiveSummary: "Executive Summary",
    findings: "Findings",
    recommendations: "Recommendations",
    appendix: "Appendix",
  },
};

export const getReportLabels = (locale: SupportedLocale = "pt-BR") => LABELS[locale] ?? LABELS["pt-BR"];

const formatContent = (content: Record<string, unknown>): string =>
  Object.entries(content).map(([key, value]) => `- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n");

export const renderMarkdownArtifact = (title: string, reportVersionId: string, sections: ReportSectionResponse[], locale: SupportedLocale = "pt-BR"): RenderedReportArtifact => {
  const labels = getReportLabels(locale);
  return {
    artifact_type: "report",
    format: "markdown",
    mime_type: "text/markdown",
    content: [
      `# ${title}`,
      "",
      `${labels.reportVersion}: \`${reportVersionId}\``,
      `${labels.generatedAt}: ${new Date().toISOString()}`,
      "",
      ...sections.map((section) => [`## ${section.title}`, "", formatContent(section.content), ""].join("\n"))
    ].join("\n")
  };
};


