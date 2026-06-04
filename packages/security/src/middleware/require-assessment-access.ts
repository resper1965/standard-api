import type { SecurityTenantContext } from "@standard/schemas";
import { TenantGuard } from "../tenancy/tenant-guard";

export const requireAssessmentAccess = (
  assessment: { organization_id: string; assessment_id: string },
  tenant: SecurityTenantContext
): void => {
  const decision = new TenantGuard().validateAssessmentAccess(assessment, tenant);
  if (!decision.allowed) throw new Error(decision.reason ?? "assessment_mismatch");
};

