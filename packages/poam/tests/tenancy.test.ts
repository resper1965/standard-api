import { PoamDraftService } from "../src/index";
import { context, createApprovedGapFixture, ids, updateGapFinding } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("tenant isolation para poam_items", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const items = await poam.repositories.items.listByVersion(draft.poam_version_id, ids.otherTenantId);
  expect(items.length).toBe(0);
});

test("dependencies nao cruzam tenant", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  await expectRejects(
    () => poam.repositories.dependencies.save({
      poam_dependency_id: "99999999-9999-4999-8999-999999999999",
      organization_id: ids.otherTenantId,
      assessment_id: context.assessmentId,
      poam_item_id: item!.poam_item_id,
      depends_on_poam_item_id: item!.poam_item_id,
      dependency_type: "blocks",
      description: "Invalid cross-tenant dependency.",
      created_at: new Date().toISOString()
    }),
    "POAM_TENANT_MISMATCH"
  );
});
