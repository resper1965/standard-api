/**
 * @standard/sdk — Official TypeScript SDK for the Standard API
 *
 * Usage:
 *   import { StandardClient } from "@standard/sdk";
 *
 *   const client = new StandardClient({
 *     apiKey: "standard_live_...",
 *     organizationId: "your-organization-uuid",
 *   });
 *
 *   // Automatic retry on 429/5xx, exponential backoff, Retry-After aware
 *   const assessments = await client.assessments.list();
 *
 *   // Auto-paginate all controls
 *   for await (const control of client._paginate("/scf/controls")) { ... }
 *
 *   // Verify webhook signature (timing-safe HMAC-SHA256)
 *   const event = await client.webhooks.constructEvent(rawBody, sig, secret);
 *
 *   // Wait for ingestion to complete
 *   const job = await client.jobs.waitForCompletion(jobId);
 */

export { StandardClient, type StandardClientConfig } from "./client.js";
export { StandardError, type StandardErrorResponse } from "./errors.js";
export type {
  RequestOptions,
  RetryConfig,
  PaginatedResponse,
  StandardResponse,
  ListQuery,
} from "./types.js";
export type { WebhookEvent } from "./crypto.js";
export type {
  JobStatus,
  JobRecord,
  UsagePeriod,
  UsageRecord,
} from "./client.js";
export type * from "./models.js";
