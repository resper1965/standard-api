import type { ReportSectionResponse } from "@aegis/schemas";
import type { RenderedReportArtifact } from "../types";

export const renderJsonArtifact = (reportVersionId: string, sections: ReportSectionResponse[]): RenderedReportArtifact => ({
  artifact_type: "report",
  format: "json",
  mime_type: "application/json",
  content: JSON.stringify({ report_version_id: reportVersionId, sections }, null, 2)
});
