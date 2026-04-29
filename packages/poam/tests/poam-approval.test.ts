import { PoamApprovalService, PoamDraftService, PoamReviewService } from "../src/index";
import { context, createApprovedGapFixture, ids, updateGapFinding } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

const createReviewReadyPoam = async () => {
  const fixture = await createApprovedGapFixture();
  await updateGapFinding(fixture.gap, fixture.findings[0]!, { assessment_status: "not_met", gap_type: "implementation_gap" });
  const draft = await new PoamDraftService(fixture.poam).createPoamDraft(context.assessmentId, fixture.approvedGap.gap_analysis_version_id, {}, context);
  const submitted = await new PoamReviewService(fixture.poam).submitPoamForReview(draft.poam_version_id, context);
  return { ...fixture, submitted };
};

test("approval sem actor_id é bloqueado", async () => {
  const { poam, submitted } = await createReviewReadyPoam();
  const { actorId: _actorId, ...contextWithoutActor } = context;
  await expectRejects(
    () => new PoamApprovalService(poam).approvePoam(submitted.poam_version_id, { approval_event_id: ids.approvalId }, contextWithoutActor),
    "POAM_ACTOR_REQUIRED"
  );
});

test("approval sem approval_event é bloqueado", async () => {
  const { poam, submitted } = await createReviewReadyPoam();
  await expectRejects(() => new PoamApprovalService(poam).approvePoam(submitted.poam_version_id, {}, context), "APPROVAL_EVENT_REQUIRED");
});

test("approval valido marca versao approved", async () => {
  const { poam, submitted } = await createReviewReadyPoam();
  const approved = await new PoamApprovalService(poam).approvePoam(submitted.poam_version_id, { approval_event_id: ids.approvalId }, context);
  expect(approved.status).toBe("approved");
  expect(approved.approved_by).toBe(context.actorId);
});

test("POA&M approved é imutável", async () => {
  const { poam, submitted } = await createReviewReadyPoam();
  const approved = await new PoamApprovalService(poam).approvePoam(submitted.poam_version_id, { approval_event_id: ids.approvalId }, context);
  const [item] = await poam.repositories.items.listByVersion(approved.poam_version_id, context.tenantId);
  await expectRejects(
    () => new PoamReviewService(poam).updatePoamItem(item!.poam_item_id, { corrective_action: "Updated action" }, context),
    "POAM_IMMUTABLE"
  );
});
