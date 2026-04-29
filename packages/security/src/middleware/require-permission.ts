import type { AuthContext, Permission, SecurityTenantContext } from "@aegis/schemas";
import { PolicyEngine } from "../rbac/policy-engine";

export const requirePermission = (
  auth: AuthContext | undefined,
  tenant: SecurityTenantContext | undefined,
  permissions: Permission[],
  traceId: string
): void => {
  const decision = new PolicyEngine().authorize({ auth, tenant, required_permissions: permissions, trace_id: traceId });
  if (!decision.allowed) throw new Error(decision.reason ?? "permission_missing");
};
