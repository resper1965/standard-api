import { EvidenceAnalysisService, GapDraftService } from "../src/index";
import { context, createApprovedSoaFixture, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Gap findings não cruzam tenant", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  await new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context);
  const draft = await new GapDraftService(gap).createGapAnalysisDraft(ids.assessmentId, approvedSoa.soa_version_id, context);
  const otherTenant = await new GapDraftService(gap).listGapFindings(draft.gap_analysis_version_id, {}, {
    ...context,
    organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  });
  expect(otherTenant.length).toBe(0);
});
