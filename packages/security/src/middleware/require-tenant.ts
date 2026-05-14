import type { SecurityTenantContext } from "@standard/schemas";

export const requireTenantContext = (tenant?: SecurityTenantContext): SecurityTenantContext => {
  if (!tenant) throw new Error("TENANT_CONTEXT_REQUIRED");
  return tenant;
};

