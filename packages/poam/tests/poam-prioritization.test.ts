import { PoamDraftService } from "../src/index";
import { context, createApprovedGapFixture, updateGapFinding } from "./helpers";
import { expect, test } from "./test-kit";

test("documentation_gap gera policy_update ou procedure_creation", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "partially_met", gap_type: "documentation_gap", severity: "low" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  expect(item!.action_type).toBe("policy_update");
});

test("monitoring_gap gera monitoring_improvement", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met", gap_type: "monitoring_gap", severity: "medium" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  expect(item!.action_type).toBe("monitoring_improvement");
});

test("maturity score baixo aumenta prioridade", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "partially_met", gap_type: "governance_gap", severity: "medium" });
  poam.maturity = {
    findApprovedOrDraftByAssessment: async () => ({ maturity_assessment_version_id: "77777777-7777-4777-8777-777777777777", status: "approved" }),
    findScoreByControl: async () => ({ maturity_score_id: "88888888-8888-4888-8888-888888888888", scf_control_id: findings[0]!.scf_control_id!, score: 1, confidence_score: 0.8 })
  };
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  expect(item!.priority).toBe("urgent");
  expect(item!.target_maturity_score).toBe(3);
});

test("ausencia de maturity assessment permite POA&M com limitacao", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met", gap_type: "implementation_gap" });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  expect(draft.metadata.limitations[0]).toBe("Maturity Assessment not available; prioritization used Gap Analysis and SCF context only.");
});

test("confidence baixa marca requires_user_validation", async () => {
  const { poam, gap, approvedGap, findings } = await createApprovedGapFixture();
  await updateGapFinding(gap, findings[0]!, { assessment_status: "not_met", confidence_score: 0.3 });
  const draft = await new PoamDraftService(poam).createPoamDraft(context.assessmentId, approvedGap.gap_analysis_version_id, {}, context);
  const [item] = await poam.repositories.items.listByVersion(draft.poam_version_id, context.organizationId);
  expect(item!.requires_user_validation).toBe(true);
});
