import { EvidenceAnalysisService } from "../src/index";
import { context, createApprovedSoaFixture, ids } from "./helpers";
import { expect, expectRejects, test } from "./test-kit";

test("Bloqueia Evidence Analysis sem tenant context", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  const { tenantId: _tenantId, ...badContext } = context;
  await expectRejects(() => new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, badContext as never), "TENANT_CONTEXT_REQUIRED");
});

test("Bloqueia Evidence Analysis sem SoA aprovada", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  await gap.soa.repositories.versions.update({ ...approvedSoa, status: "draft" });
  await expectRejects(() => new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context), "APPROVED_SOA_REQUIRED");
});

test("Ausência de KB gera evidence_status not_evidenced", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture();
  const result = await new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context);
  expect(result.findings.length).toBeGreaterThan(0);
  expect(result.findings[0]!.evidence_status).toBe("not_evidenced");
});

test("Evidence source preserva document_id, chunk_id e retrieval_score", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture(true);
  const result = await new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context);
  const sources = await gap.repositories.evidenceSources.listByFinding(result.findings[0]!.evidence_finding_id, ids.tenantId);
  expect(sources.length).toBeGreaterThan(0);
  expect(sources[0]!.document_id).toBe(ids.documentId);
  expect(sources[0]!.chunk_id).toBe(ids.chunkId);
  expect(sources[0]!.retrieval_score).toBeGreaterThan(0);
});

test("Evidence Analysis não cruza tenant", async () => {
  const { gap, approvedSoa } = await createApprovedSoaFixture(true);
  await new EvidenceAnalysisService(gap).runEvidenceAnalysis(ids.assessmentId, approvedSoa.soa_version_id, context);
  const otherTenant = await new EvidenceAnalysisService(gap).listEvidenceFindings(ids.assessmentId, {}, {
    ...context,
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  });
  expect(otherTenant.length).toBe(0);
});
