import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import type { AppDependencies } from "./http";

export interface Env {
  DATABASE_URL?: string;
  ASSESSMENT_WORKFLOW: Workflow;
  AEGIS_DOCUMENTS_BUCKET: R2Bucket;
  AEGIS_REPORTS_BUCKET?: R2Bucket;
  AEGIS_EXPORTS_BUCKET?: R2Bucket;
  DOCUMENT_INGESTION_QUEUE?: Queue;
  KB_EMBEDDING_QUEUE?: Queue;
  REPORT_EXPORT_QUEUE?: Queue;
  AEGIS_CACHE?: KVNamespace;
}

let cachedDeps: AppDependencies | null = null;
let cachedApp: ReturnType<typeof createApp> | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!cachedApp) {
      if (env.DATABASE_URL) {
        cachedDeps = createDrizzleRepositories(createDb(env.DATABASE_URL), env);
      } else {
        cachedDeps = createMockRepositories();
      }
      cachedApp = createApp(cachedDeps);
    }
    return cachedApp.fetch(request);
  }
};
