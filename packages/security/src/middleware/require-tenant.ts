import type { SecurityTenantContext } from "@aegis/schemas";

export const requireTenantContext = (tenant?: SecurityTenantContext): SecurityTenantContext => {
  if (!tenant) throw new Error("TENANT_CONTEXT_REQUIRED");
  return tenant;
};
