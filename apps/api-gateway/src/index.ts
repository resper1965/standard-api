import { createApp } from "./app";

export interface Env {
  ASSESSMENT_WORKFLOW: Workflow;
  AEGIS_DOCUMENTS_BUCKET: R2Bucket;
  AEGIS_REPORTS_BUCKET?: R2Bucket;
  AEGIS_EXPORTS_BUCKET?: R2Bucket;
  DOCUMENT_INGESTION_QUEUE?: Queue;
  KB_EMBEDDING_QUEUE?: Queue;
  REPORT_EXPORT_QUEUE?: Queue;
  AEGIS_CACHE?: KVNamespace;
}

const app = createApp();

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  }
};
