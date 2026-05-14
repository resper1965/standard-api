import { PoamDraftService } from "../src/index";
import { context, createApprovedGapFixture, updateGapFinding } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("bloqueia POA&M sem tenant context", async () => {
  const { poam, approvedGap } = await createApprovedGapFixture();
  await expectRejects(
    () => new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, { ...context, tenantId: "" }),
    "POAM_CONTEXT_REQUIRED"
  );
});

test("bloqueia POA&M sem Gap Analysis aprovado", async () => {
  const { poam, gap, approvedGap } = await createApprovedGapFixture();
  await gap.repositories.gapVersions.update({ ...approvedGap, status: "draft" });
  await expectRejects(
    () => new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context),
    "APPROVED_GAP_ANALYSIS_REQUIRED"
  );
});

test("cria poam_version draft e itens rastreaveis para not_met", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  const source = await updateGapFinding(gap, findings[0]!, {
    assessment_status: "not_met",
    gap_type: "implementation_gap",
    severity: "high",
    confidence_score: 0.9
  });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const items = await poam.repositories.items.listByVersion(draft.poam_version_id, context.tenantId);
  expect(draft.status).toBe("draft");
  expect(items.length).toBeGreaterThan(0);
  expect(items[0]!.related_gap_finding_id).toBe(source.gap_finding_id);
  expect(items[0]!.framework_requirement_id).toBe(source.framework_requirement_id);
  expect(items[0]!.scf_control_id).toBe(source.scf_control_id);
  expect(items[0]!.action_type).toBe("technical_implementation");
});

test("not_evidenced gera evidence_collection", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_evidenced", gap_type: "evidence_gap", severity: "medium" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const items = await poam.repositories.items.listByVersion(draft.poam_version_id, context.tenantId);
  expect(items[0]!.action_type).toBe("evidence_collection");
});

test("not_applicable_justified nao gera item obrigatorio", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await Promise.all(findings.map((finding) => updateGapFinding(gap, finding, { assessment_status: "not_applicable_justified" })));
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const items = await poam.repositories.items.listByVersion(draft.poam_version_id, context.tenantId);
  expect(items.length).toBe(0);
});

test("gera milestones vinculados ao poam_item", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "partially_met", gap_type: "documentation_gap", severity: "medium" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const items = await poam.repositories.items.listByVersion(draft.poam_version_id, context.tenantId);
  const milestones = await poam.repositories.milestones.listByItem(items[0]!.poam_item_id, context.tenantId);
  expect(milestones.length).toBeGreaterThan(0);
  expect(milestones[0]!.poam_item_id).toBe(items[0]!.poam_item_id);
});
