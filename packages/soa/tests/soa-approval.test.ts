import { SoaApprovalService, SoaDraftService, SoaReviewService } from "../src/index";
import { context, createSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

const createReviewReadyDraft = async () => {
  const deps = createSoaFixture();
  const draftService = new SoaDraftService(deps);
  const reviewService = new SoaReviewService(deps);
  const approvalService = new SoaApprovalService(deps);
  const draft = await draftService.createDraftFromFramework(ids.assessmentId, ids.frameworkId, ids.scfVersionId, context);
  const underReview = await reviewService.submitSoaForReview(draft.soa_version_id, context);
  return { deps, draftService, reviewService, approvalService, underReview };
};

test("Approval sem actor_id é bloqueado", async () => {
  const { approvalService, underReview } = await createReviewReadyDraft();
  const { actorId: _actorId, ...contextWithoutActor } = context;
  await expectRejects(() => approvalService.approveSoa(underReview.soa_version_id, {
    approval_event_id: ids.approvalId
  }, contextWithoutActor), "ACTOR_REQUIRED");
});

test("Approval sem approval_event é bloqueado", async () => {
  const { approvalService, underReview } = await createReviewReadyDraft();
  await expectRejects(() => approvalService.approveSoa(underReview.soa_version_id, {}, context), "APPROVAL_EVENT_REQUIRED");
});

test("Approval válido marca versão como approved e imutável", async () => {
  const { draftService, reviewService, approvalService, underReview } = await createReviewReadyDraft();
  const approved = await approvalService.approveSoa(underReview.soa_version_id, {
    approval_event_id: ids.approvalId
  }, context);
  const items = await draftService.listSoaItems(approved.soa_version_id, {}, context);
  expect(approved.status).toBe("approved");
  await expectRejects(() => reviewService.updateSoaItemDecision(items[0]!.soa_item_id, {
    applicability_status: "partially_applicable",
    applicability_rationale: "Change after approval"
  }, context), "SOA_VERSION_IMMUTABLE");
});

test("Mark ingested atualiza status de reingestão da SoA", async () => {
  const { approvalService, underReview } = await createReviewReadyDraft();
  const approved = await approvalService.approveSoa(underReview.soa_version_id, {
    approval_event_id: ids.approvalId
  }, context);
  const marked = await approvalService.markSoaIngestionRequired(approved.soa_version_id, context);
  expect(marked.metadata.soa_ingestion_status).toBe("required");
});
