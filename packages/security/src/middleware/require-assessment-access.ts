import type { SecurityTenantContext } from "@aegis/schemas";
import { TenantGuard } from "../tenancy/tenant-guard";

export const requireAssessmentAccess = (
  assessment: { tenant_id: string; organization_id: string; assessment_id: string },
  tenant: SecurityTenantContext
): void => {
  const decision = new TenantGuard().validateAssessmentAccess(assessment, tenant);
  if (!decision.allowed) throw new Error(decision.reason ?? "assessment_mismatch");
};
