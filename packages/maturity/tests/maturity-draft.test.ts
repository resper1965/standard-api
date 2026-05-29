import { test, expect } from "./test-kit";
import { createMaturityDraft } from "../src";
import type { MaturityContext, MaturityDependencies } from "../src/types";

const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333"
};

const context = (): MaturityContext => ({
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  traceId: "trace-test-0001"
});

test("createMaturityDraft calcula maturidade dinamicamente baseado nos status e tipos dos gaps", async () => {
  const versionsStore: any[] = [];
  const scoresStore: any[] = [];

  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save(v) { versionsStore.push(v); },
        async update() {},
        async get() { return null; },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany(s) { scoresStore.push(...s); },
        async update() {},
        async get() { return null; },
        async listByVersion() { return []; }
      }
    },
    async getApprovedGapAnalysis(assessmentId, tenantId) {
      return {
        version: {
          gap_analysis_version_id: "gap-ver-id",
          tenant_id: tenantId,
          organization_id: ids.organizationId,
          assessment_id: assessmentId,
          version_number: 1,
          status: "approved",
          source_soa_version_id: "soa-ver-id",
          framework_id: "fw-id",
          scf_version_id: "scf-ver-id",
          created_by: "actor-id",
          created_at: new Date().toISOString(),
          trace_id: "trace-id"
        },
        findings: [
          {
            gap_finding_id: "find-1",
            tenant_id: tenantId,
            organization_id: ids.organizationId,
            assessment_id: assessmentId,
            gap_analysis_version_id: "gap-ver-id",
            soa_version_id: "soa-ver-id",
            soa_item_id: "item-1",
            framework_id: "fw-id",
            framework_requirement_id: "req-1",
            scf_version_id: "scf-ver-id",
            scf_control_id: "scf-ctrl-1",
            gap_code: "CTRL-001",
            assessment_status: "met",
            gap_type: "no_gap",
            severity: "informational",
            gap_summary: "Fully met control",
            confidence_score: 0.9,
            requires_user_validation: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            gap_finding_id: "find-2",
            tenant_id: tenantId,
            organization_id: ids.organizationId,
            assessment_id: assessmentId,
            gap_analysis_version_id: "gap-ver-id",
            soa_version_id: "soa-ver-id",
            soa_item_id: "item-2",
            framework_id: "fw-id",
            framework_requirement_id: "req-2",
            scf_version_id: "scf-ver-id",
            scf_control_id: "scf-ctrl-2",
            gap_code: "CTRL-002",
            assessment_status: "partially_met",
            gap_type: "implementation_gap",
            severity: "medium",
            gap_summary: "Partially met control",
            confidence_score: 0.8,
            requires_user_validation: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            gap_finding_id: "find-3",
            tenant_id: tenantId,
            organization_id: ids.organizationId,
            assessment_id: assessmentId,
            gap_analysis_version_id: "gap-ver-id",
            soa_version_id: "soa-ver-id",
            soa_item_id: "item-3",
            framework_id: "fw-id",
            framework_requirement_id: "req-3",
            scf_version_id: "scf-ver-id",
            scf_control_id: "scf-ctrl-3",
            gap_code: "CTRL-003",
            assessment_status: "not_met",
            gap_type: "implementation_gap",
            severity: "high",
            gap_summary: "Not met control",
            confidence_score: 0.95,
            requires_user_validation: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };
    }
  };

  const result = await createMaturityDraft(context(), deps);

  expect(versionsStore.length).toBe(1);
  expect(scoresStore.length).toBe(3);

  // MET + NO_GAP -> Level 5 (Optimizing)
  const score1 = scoresStore.find(s => s.scfControlId === "scf-ctrl-1");
  expect(score1).toBeDefined();
  expect(score1.score).toBe(5);
  expect(score1.evidenceCoverage).toBe(1.0);

  // PARTIALLY_MET + IMPLEMENTATION_GAP -> Level 2 (Managed)
  const score2 = scoresStore.find(s => s.scfControlId === "scf-ctrl-2");
  expect(score2).toBeDefined();
  expect(score2.score).toBe(2);
  expect(score2.evidenceCoverage).toBe(0.5);

  // NOT_MET -> Level 0 (Incomplete)
  const score3 = scoresStore.find(s => s.scfControlId === "scf-ctrl-3");
  expect(score3).toBeDefined();
  expect(score3.score).toBe(0);
  expect(score3.evidenceCoverage).toBe(0.0);
});
