import { ScopeService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("Criar escopo draft preserva tenant, organization e assessment", async () => {
  const deps = createSoaFixture();
  const service = new ScopeService(deps);
  const scope = await service.createDraftScope({
    title: "Synthetic scope",
    description: "Synthetic test scope",
    business_units: ["Security"],
    systems: ["IAM"],
    exclusions: [],
    assumptions: ["Synthetic only"]
  }, context);

  expect(scope.tenant_id).toBe(ids.tenantId);
  expect(scope.organization_id).toBe(ids.organizationId);
  expect(scope.assessment_id).toBe(ids.assessmentId);
  expect(scope.status).toBe("draft");
});

test("Bloqueia escopo sem tenant context", async () => {
  const deps = createSoaFixture();
  const service = new ScopeService(deps);
  await expectRejects(() => service.createDraftScope({
    title: "Invalid",
    description: "Missing tenant",
    exclusions: [],
    assumptions: []
  }, { ...context, tenantId: "" }), "TENANT_CONTEXT_REQUIRED");
});
