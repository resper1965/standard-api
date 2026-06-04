import { SoaDraftService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Listagem de SoA não cruza tenant", async () => {
  const deps = createSoaFixture();
  const service = new SoaDraftService(deps);
  await service.createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const otherTenant = await service.listSoaVersions(ids.assessmentId, {
    ...context,
    organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  });
  expect(otherTenant.length).toBe(0);
});
