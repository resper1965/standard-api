import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  organizationId: string;
  actorId?: string;
}

/**
 * AsyncLocalStorage for Tenant Isolation.
 * This ensures that the organization_id is available across the async execution context,
 * which can be used to inject the tenant ID into the Database driver for Row-Level Security (RLS)
 * or for automatic logging interception.
 */
export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Executes a function within the tenant context.
 * 
 * @param context The tenant context (organizationId, etc)
 * @param callback The function to execute
 */
export function runWithTenantContext<T>(context: TenantContext, callback: () => T): T {
  return tenantContextStorage.run(context, callback);
}

/**
 * Gets the current active tenant context.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Gets the current active organization ID.
 */
export function getCurrentOrganizationId(): string | undefined {
  return getTenantContext()?.organizationId;
}
