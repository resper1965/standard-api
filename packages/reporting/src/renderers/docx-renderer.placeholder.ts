import { ReportingWorkflowError } from "../errors";

export const renderDocxPlaceholder = (): never => {
  throw new ReportingWorkflowError("REPORT_FORMAT_NOT_IMPLEMENTED", "DOCX rendering is a documented extension point for a future server-side renderer.");
};
