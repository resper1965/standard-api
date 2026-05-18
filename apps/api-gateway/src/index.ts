import "./openapi/registry"; // Must be imported first to extend Zod
import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import { createAuth, type StandardAuth } from "@standard/auth";
import type { SendEmail } from "@standard/email";
import type { AppDependencies } from "./http";
import * as schema from "@standard/schemas";

export interface Env {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_JWKS_URL?: string;
  JWT_SECRET?: string;
  STANDARD_ENV?: string;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  ASSESSMENT_WORKFLOW?: Workflow;
  STANDARD_DOCUMENTS_BUCKET: R2Bucket;
  STANDARD_REPORTS_BUCKET?: R2Bucket;
  STANDARD_EXPORTS_BUCKET?: R2Bucket;
  DOCUMENT_INGESTION_QUEUE?: Queue;
  KB_EMBEDDING_QUEUE: Queue;
  REPORT_EXPORT_QUEUE: Queue;
  AGENT_RUN_QUEUE: Queue;
  SOC_TRIAGE_QUEUE?: Queue;
  EMAIL: Fetcher;
  STANDARD_CACHE?: KVNamespace;
  STANDARD_CONFIG_KV?: KVNamespace;
  STANDARD_FEATURE_FLAGS_KV?: KVNamespace;
  STANDARD_KB_INDEX?: VectorizeIndex;
  AI?: Ai;
  /** SOC webhook endpoint for alert delivery */
  SOC_WEBHOOK_URL?: string;
  /** Cloudflare Email Service binding for transactional emails */
}

let cachedDeps: AppDependencies | undefined;
let cachedApp: ReturnType<typeof createApp> | null = null;
let appInitialized = false;
let cachedAuth: StandardAuth | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // API Authentication is managed exclusively by Neon Auth.
    // The Gateway intercepts valid JWT tokens via NeonAuthValidator middleware during standard routing.

    if (!cachedApp) {
      const hasDb = Boolean(env.DATABASE_URL);
      console.log(`[standard:init] Starting API gateway. DATABASE_URL=${hasDb ? 'SET' : 'MISSING'}, ENV=${env.STANDARD_ENV}`);
      if (hasDb) {
        const db = createDb(env.DATABASE_URL!);
        cachedDeps = {
          ...createDrizzleRepositories(db, env),
          email: (env.EMAIL as unknown as SendEmail) ?? undefined,
          AGENT_RUN_QUEUE: env.AGENT_RUN_QUEUE ?? undefined,
          SOC_TRIAGE_QUEUE: env.SOC_TRIAGE_QUEUE ?? undefined,
        };

        // Initialize Neon Auth / Stateless JWKS Validator
        cachedAuth = createAuth({
          NEON_AUTH_JWKS_URL: env.JWT_JWKS_URL ?? "https://ep-REDACTED-endpoint.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json",
        });
        console.log('[standard:init] Drizzle repositories initialized.');
      } else {
        console.warn('[standard:init] No DATABASE_URL — using MOCK repositories. SCF data will be synthetic.');
        cachedDeps = createMockRepositories();
      }
      cachedApp = createApp(cachedDeps, env, cachedAuth ?? undefined);
    }
    return cachedApp.fetch(request, ctx);
  }
};
