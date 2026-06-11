import { SoaDraftService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Cria SoA draft a partir de framework e mappings oficiais SCF", async () => {
  const deps = createSoaFixture();
  const service = new SoaDraftService(deps);
  const draft = await service.createDraftFromFramework(
    ids.assessmentId,
    ids.frameworkId,
    ids.scfVersionId,
    context,
  );
  const items = await service.listSoaItems(draft.soa_version_id, {}, context);

  expect(draft.status).toBe("draft");
  expect(draft.source_framework_id).toBe(ids.frameworkId);
  expect(items.length).toBe(2);
  expect(items[0]!.framework_requirement_id).toBeDefined();
  expect(items[0]!.scf_control_id).toBeDefined();
  expect(items[0]!.source_mapping_id).toBeDefined();
  expect(items[0]!.relationship_type).toBe("intersects");
});

test("Requisito sem mapping oficial vira item requires_validation", async () => {
  const deps = createSoaFixture();
  const service = new SoaDraftService(deps);
  const draft = await service.createDraftFromRequirements(
    {
      assessmentId: ids.assessmentId,
      frameworkId: ids.frameworkId,
      scfVersionId: ids.scfVersionId,
      requirements: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          scf_framework_id: ids.frameworkId,
          requirement_code: "SYNTH-UNMAPPED",
          requirement_title: "Unmapped synthetic requirement",
          requirement_text: "No official mapping in fixture.",
          sort_order: 99,
          status: "active" as const,
          is_synthetic: true,
          is_mcr: false,
        },
      ],
      mappings: [],
    },
    context,
  );
  const items = await service.listSoaItems(draft.soa_version_id, {}, context);
  expect(items.length).toBe(1);
  expect(items[0]!.applicability_status).toBe("requires_validation");
  expect(items[0]!.mapping_status).toBe("no_official_mapping");
});
