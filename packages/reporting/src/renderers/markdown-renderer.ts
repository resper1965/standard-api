import type { ReportSectionResponse } from "@aegis/schemas";
import type { RenderedReportArtifact } from "../types";

const formatContent = (content: Record<string, unknown>): string =>
  Object.entries(content).map(([key, value]) => `- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n");

export const renderMarkdownArtifact = (title: string, reportVersionId: string, sections: ReportSectionResponse[]): RenderedReportArtifact => ({
  artifact_type: "report",
  format: "markdown",
  mime_type: "text/markdown",
  content: [
    `# ${title}`,
    "",
    `Report version: \`${reportVersionId}\``,
    "",
    ...sections.map((section) => [`## ${section.title}`, "", formatContent(section.content), ""].join("\n"))
  ].join("\n")
});
