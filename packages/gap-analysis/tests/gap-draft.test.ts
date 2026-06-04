import { EvidenceAnalysisService, GapDraftService } from "../src/index";
import { context, createApprovedSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("Gap draft é bloqueado sem SoA aprovada", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  await gap.soa.repositories.versions.update({ ...approvedSoa, status: "draft" });
  await expectRejects(() => new GapDraftService(gap).createGapAnalysisDraft(ids.assessmentId, approvedSoa.soa_version_id, context), "APPROVED_SOA_REQUIRED");
});

test("Gap draft cria versão draft e findings rastreáveis", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  await new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context);
  const draft = await new GapDraftService(gap).createGapAnalysisDraft(ids.assessmentId, approvedSoa.soa_version_id, context);
  const findings = await new GapDraftService(gap).listGapFindings(draft.gap_analysis_version_id, {}, context);
  expect(draft.status).toBe("draft");
  expect(findings.length).toBeGreaterThan(0);
  expect(findings[0]!.soa_item_id).toBeDefined();
  expect(findings[0]!.framework_requirement_id).toBeDefined();
  expect(findings[0]!.scf_control_id).toBeDefined();
  expect(findings[0]!.assessment_status).toBe("not_evidenced");
});

test("SoA not_applicable com justificativa vira not_applicable_justified", async () => {
  const { gap, soa, approvedSoa } = await createApprovedSoaFixture();
  const items = await soa.repositories.items.listByVersion(approvedSoa.soa_version_id, ids.organizationId);
  const updatedItem = {
    ...items[0]!,
    applicability_status: "not_applicable",
    non_applicability_rationale: "Synthetic justified exclusion"
  } as const;
  await soa.repositories.items.update(updatedItem);
  const finding = await new GapDraftService(gap).generateGapFindingForSoaItem(updatedItem, undefined, context);
  expect(finding.assessment_status).toBe("not_applicable_justified");
});

test("SoA not_applicable sem justificativa vira not_applicable_not_justified", async () => {
  const { gap, soa, approvedSoa } = await createApprovedSoaFixture();
  const items = await soa.repositories.items.listByVersion(approvedSoa.soa_version_id, ids.organizationId);
  const finding = await new GapDraftService(gap).generateGapFindingForSoaItem({
    ...items[0]!,
    applicability_status: "not_applicable",
    non_applicability_rationale: undefined
  } as never, undefined, context);
  expect(finding.assessment_status).toBe("not_applicable_not_justified");
});

test("Evidência parcial vira partially_met", async () => {
  const { gap, soa, approvedSoa } = await createApprovedSoaFixture();
  const items = await soa.repositories.items.listByVersion(approvedSoa.soa_version_id, ids.organizationId);
  const finding = await new GapDraftService(gap).generateGapFindingForSoaItem(items[0]!, {
    evidence_finding_id: "99999999-9999-4999-8999-999999999999",
    evidence_strength: "partial",
    evidence_status: "candidate",
    confidence_score: 0.7
  } as never, context);
  expect(finding.assessment_status).toBe("partially_met");
});
