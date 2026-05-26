/**
 * API error codes — canonical list lives in @standard/schemas.
 * This file re-exports for backwards compatibility within the gateway.
 *
 * Do NOT duplicate the code list here. The single source of truth is:
 *   packages/schemas/src/errors.ts → ApiErrorCodeSchema (z.enum)
 *
 * Adding new error codes: edit packages/schemas/src/errors.ts only.
 */
export { ApiErrorCode } from "@standard/schemas";
