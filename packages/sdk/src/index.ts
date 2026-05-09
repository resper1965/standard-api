/**
 * @standard/sdk — Official TypeScript SDK for the Standard API
 *
 * Usage:
 *   import { StandardClient } from "@standard/sdk";
 *
 *   const client = new StandardClient({
 *     apiKey: "standard_live_...",
 *     tenantId: "your-tenant-uuid",
 *   });
 *
 *   const assessments = await client.assessments.list();
 *   const controls = await client.scf.controls.list(versionId, { limit: 50 });
 */

export { StandardClient, type StandardClientConfig } from "./client";
export { StandardError, type StandardErrorResponse } from "./errors";
export type {
  RequestOptions,
  PaginatedResponse,
} from "./types";
