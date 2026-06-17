import { ApiError } from "./api-error";

/**
 * Thrown when a background worker detects that the payload's Tenant ID
 * does not match the execution context or organizational boundaries.
 * 
 * Crucial for preventing cross-tenant data contamination in multi-tenant queues.
 */
export class TenantMismatchError extends ApiError {
  constructor(message: string = "Tenant context mismatch detected in background worker") {
    super("TENANT_MISMATCH", message, 403);
    this.name = "TenantMismatchError";
  }
}

