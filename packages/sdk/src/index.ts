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
 *   const assessments = await client.assessments.list();
 *   const controls = await client.scf.controls.list(versionId, { limit: 50 });
 */

export { StandardClient, type StandardClientConfig } from "./client.js";
export { StandardError, type StandardErrorResponse } from "./errors.js";
export type {
  RequestOptions,
  PaginatedResponse,
  StandardResponse,
  ListQuery,
} from "./types.js";
export type * from "./models.js";
