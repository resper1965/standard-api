import { SoaDraftService, SoaEvidenceService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Evidence refresh não transforma ausência de evidência em not_applicable", async () => {
  const deps = createSoaFixture();
  const draftService = new SoaDraftService(deps);
  const evidenceService = new SoaEvidenceService(deps);
  const draft = await draftService.createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  await evidenceService.refreshEvidenceCoverage(draft.soa_version_id, context);
  const items = await draftService.listSoaItems(draft.soa_version_id, {}, context);
  expect(items[0]!.implementation_status).toBe("not_evidenced");
  expect(items[0]!.applicability_status).toBe("requires_validation");
});
