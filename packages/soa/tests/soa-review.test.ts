import { SoaDraftService, SoaReviewService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

const createDraft = async () => {
  const deps = createSoaFixture();
  const draftService = new SoaDraftService(deps);
  const reviewService = new SoaReviewService(deps);
  const draft = await draftService.createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const items = await draftService.listSoaItems(draft.soa_version_id, {}, context);
  return { deps, draftService, reviewService, draft, item: items[0]! };
};

test("not_applicable sem justificativa é inválido", async () => {
  const { reviewService, item } = await createDraft();
  await expectRejects(() => reviewService.updateSoaItemDecision(item.soa_item_id, {
    applicability_status: "not_applicable"
  }, context), "NON_APPLICABILITY_RATIONALE_REQUIRED");
});

test("out_of_scope sem justificativa é inválido", async () => {
  const { reviewService, item } = await createDraft();
  await expectRejects(() => reviewService.updateSoaItemDecision(item.soa_item_id, {
    applicability_status: "out_of_scope"
  }, context), "SCOPE_RATIONALE_REQUIRED");
});

test("Submit review bloqueia item to_be_defined sem exceção", async () => {
  const { reviewService, draft, item } = await createDraft();
  await reviewService.updateSoaItemDecision(item.soa_item_id, {
    applicability_status: "to_be_defined",
    validation_notes: "Needs owner decision"
  }, context);
  await expectRejects(() => reviewService.submitSoaForReview(draft.soa_version_id, context), "SOA_REVIEW_BLOCKED");
});

test("Submit review permite SoA válida", async () => {
  const { reviewService, draft } = await createDraft();
  const submitted = await reviewService.submitSoaForReview(draft.soa_version_id, context);
  expect(submitted.status).toBe("under_review");
});
