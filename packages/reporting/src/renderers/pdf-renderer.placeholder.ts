import { ReportingWorkflowError } from "../errors";

export const renderPdfPlaceholder = (): never => {
  throw new ReportingWorkflowError("REPORT_FORMAT_NOT_IMPLEMENTED", "PDF rendering is a documented extension point for a future server-side renderer.");
};
