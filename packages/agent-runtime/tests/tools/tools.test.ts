import { test, expect } from "../test-kit";
import { createScfControlLookupTool } from "../../src/tools/scf-control-lookup.tool";
import { createKbEvidenceSearchTool } from "../../src/tools/kb-evidence-search.tool";
import { createAssessmentStateReadTool } from "../../src/tools/assessment-state-read.tool";

// ── scf_control_lookup ──────────────────────────────────────────

test("scf_control_lookup returns controls matching the query", async () => {
  const mockScf = {
    searchControls: async (_query: string, _topK?: number) => [
      { id: "SCF-AST-001", domain: "AST", title: "Asset Governance" },
      { id: "SCF-AST-002", domain: "AST", title: "Asset Inventories" },
    ],
  };
  const tool = createScfControlLookupTool(mockScf);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1", query: "asset management",
  });
  expect(result.count).toBe(2);
  expect(result.query).toBe("asset management");
  expect(result.controls.length).toBe(2);
});

test("scf_control_lookup returns empty when no match", async () => {
  const mockScf = {
    searchControls: async () => [],
  };
  const tool = createScfControlLookupTool(mockScf);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1", query: "nonexistent",
  });
  expect(result.count).toBe(0);
  expect(result.controls.length).toBe(0);
});

// ── kb_evidence_search ──────────────────────────────────────────

test("kb_evidence_search returns evidence matching query", async () => {
  const mockKb = {
    semanticSearch: async () => [{
      chunk_id: "c1", document_id: "d1", content: "Security Policy v3.1",
      score: 0.92, metadata: { filename: "security-policy.pdf" },
    }],
  };
  const tool = createKbEvidenceSearchTool(mockKb);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1", query: "security policy",
  });
  expect(result.count).toBe(1);
  expect(result.disclaimer).toBeDefined();
});

test("kb_evidence_search returns empty when no evidence found", async () => {
  const mockKb = {
    semanticSearch: async () => [],
  };
  const tool = createKbEvidenceSearchTool(mockKb);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1", query: "nonexistent",
  });
  expect(result.count).toBe(0);
  expect(result.evidence.length).toBe(0);
});

// ── assessment_state_read ───────────────────────────────────────

test("assessment_state_read returns snapshot when found", async () => {
  const mockDeps = {
    getAssessmentSnapshot: async () => ({
      assessment_id: "a1", tenant_id: "t1", organization_id: "o1",
      state: "gap_analysis_drafted", framework_id: "f1",
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z",
      metadata: {},
    }),
  };
  const tool = createAssessmentStateReadTool(mockDeps);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1",
  });
  expect(result.found).toBe(true);
  expect(result.snapshot).toBeDefined();
});

test("assessment_state_read returns found=false when not found", async () => {
  const mockDeps = {
    getAssessmentSnapshot: async () => null,
  };
  const tool = createAssessmentStateReadTool(mockDeps);
  const result = await tool.execute({
    tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
    trace_id: "tr1",
  });
  expect(result.found).toBe(false);
});
