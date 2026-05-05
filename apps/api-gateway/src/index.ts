import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import { createAuth, type AegisAuth } from "@aegis/auth";
import type { SendEmail } from "@aegis/email";
import type { AppDependencies } from "./http";

export interface Env {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_JWKS_URL?: string;
  JWT_SECRET?: string;
  AEGIS_ENV?: string;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  ASSESSMENT_WORKFLOW?: Workflow;
  AEGIS_DOCUMENTS_BUCKET: R2Bucket;
  AEGIS_REPORTS_BUCKET?: R2Bucket;
  AEGIS_EXPORTS_BUCKET?: R2Bucket;
  DOCUMENT_INGESTION_QUEUE?: Queue;
  KB_EMBEDDING_QUEUE?: Queue;
  REPORT_EXPORT_QUEUE?: Queue;
  AEGIS_CACHE?: KVNamespace;
  AEGIS_CONFIG_KV?: KVNamespace;
  AEGIS_FEATURE_FLAGS_KV?: KVNamespace;
  AEGIS_KB_INDEX?: VectorizeIndex;
  AI?: Ai;
  /** Cloudflare Email Service binding for transactional emails */
  EMAIL?: SendEmail;
}

let cachedDeps: AppDependencies | undefined;
let cachedApp: ReturnType<typeof createApp> | null = null;
let cachedAuth: AegisAuth | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!cachedApp) {
      if (env.DATABASE_URL) {
        const db = createDb(env.DATABASE_URL);
        cachedDeps = { ...createDrizzleRepositories(db, env), ...(env.EMAIL ? { email: env.EMAIL } : {}) };

        // Initialize Better Auth with the same Drizzle DB instance
        cachedAuth = createAuth(db, {
          BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
          BETTER_AUTH_URL: env.BETTER_AUTH_URL ?? new URL(request.url).origin,
          AEGIS_ENV: env.AEGIS_ENV,
          GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
          waitUntil: (p) => ctx.waitUntil(p),
        });
      } else {
        cachedDeps = createMockRepositories();
      }
      cachedApp = createApp(cachedDeps, env, cachedAuth ?? undefined);
    }
    return cachedApp.fetch(request);
  }
};
