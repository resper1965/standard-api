import { PoamDraftService, PoamReviewService, PoamValidationService } from "../src/index";
import { context, createApprovedGapFixture, updateGapFinding } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("submit-review bloqueia item sem expected_evidence", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  await poam.repositories.items.update({ ...item!, expected_evidence: [] });
  await expectRejects(() => new PoamReviewService(poam).submitPoamForReview(draft.poam_version_id, context), "POAM_REVIEW_BLOCKED");
});

test("submit-review bloqueia item sem owner", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  await poam.repositories.items.update({ ...item!, owner_role: undefined, suggested_owner: undefined });
  await expectRejects(() => new PoamReviewService(poam).submitPoamForReview(draft.poam_version_id, context), "POAM_REVIEW_BLOCKED");
});

test("validacao detecta acoes genericas sem rastreabilidade", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  await poam.repositories.items.update({ ...item!, related_gap_finding_id: undefined, rationale: "" });
  const validation = await new PoamValidationService(poam).validatePoamForReview(draft.poam_version_id, context);
  expect(validation.valid).toBe(false);
  expect(validation.errors.length).toBeGreaterThan(0);
});

test("validation_required exige requires_user_validation", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "requires_validation" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  expect(item!.action_type).toBe("validation_required");
  expect(item!.requires_user_validation).toBe(true);
});
