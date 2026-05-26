/**
 * Cloudflare Worker Environment bindings for the Standard API Gateway.
 *
 * Extracted to a standalone file to break the circular dependency between
 * `index.ts` (which defines the Worker entry point) and `http.ts` (which
 * defines shared request-handling types). Both files import from here.
 */
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
  /** Comma-separated list of allowed CORS origins — overrides the hardcoded list when set. */
  ALLOWED_ORIGINS?: string;
  /** ClamAV REST API endpoint for anti-malware scanning of uploaded documents (optional). */
  CLAMAV_API_URL?: string;
  /** Cloudflare Email Service binding for transactional emails */
}
