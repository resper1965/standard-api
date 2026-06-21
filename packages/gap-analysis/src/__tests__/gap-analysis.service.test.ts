/**
 * @standard/gap-analysis — Comprehensive Unit Tests
 *
 * Tests the core gap analysis services:
 *   1. Gap draft creation — GapDraftService
 *   2. Evidence-to-gap mapping — EvidenceAnalysisService + EvidenceClassificationService
 *   3. MCR flag validation — GapDraftService MCR enrichment
 *   4. Validation rules — GapValidationService
 *   5. Review workflow — GapReviewService
 *   6. Approval gates — GapApprovalService
 *
 * Rules (AGENTS.md):
 *   - All test data is synthetic (no real data)
 *   - Every record carries organization_id and assessment_id
 *   - Tests verify both happy paths and edge cases
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GapDraftService } from "../services/gap-draft.service";
import { GapReviewService } from "../services/gap-review.service";
import { GapApprovalService } from "../services/gap-approval.service";
import { GapValidationService } from "../services/gap-validation.service";
import { EvidenceClassificationService } from "../services/evidence-classification.service";
import { GapAnalysisWorkflowError, assertContext, assertActor } from "../errors";
import {
  deriveRocDetermination,
  calculateRiskScore,
  categorizeRisk,
  severityToImpactEffect,
  likelihoodToOccurrenceLikelihood,
} from "../services/risk-score.service";
import { createInMemoryGapAnalysisRepositories } from "../repositories/gap-analysis.repositories";
import type {
  GapAnalysisDependencies,
  GapAnalysisContext,
  GapFindingResponse,
  SoaItemResponse,
  SoaVersionResponse,
  EvidenceFindingResponse,
  KbSearchResult,
} from "../types";

// ─── Synthetic Test Constants ─────────────────────────────────────────────────

const SYNTHETIC_ORG_ID = "10000000-0000-4000-8000-000000000001";
const SYNTHETIC_ASSESSMENT_ID = "20000000-0000-4000-8000-000000000002";
const SYNTHETIC_ACTOR_ID = "30000000-0000-4000-8000-000000000003";
const SYNTHETIC_TRACE_ID = "trace-gap-analysis-test";
const SYNTHETIC_FRAMEWORK_ID = "40000000-0000-4000-8000-000000000004";
const SYNTHETIC_SCF_VERSION_ID = "50000000-0000-4000-8000-000000000005";
const SYNTHETIC_SOA_VERSION_ID = "60000000-0000-4000-8000-000000000006";
const SYNTHETIC_SOA_ITEM_ID = "70000000-0000-4000-8000-000000000007";
const SYNTHETIC_REQUIREMENT_ID = "80000000-0000-4000-8000-000000000008";
const SYNTHETIC_SCF_CONTROL_ID = "90000000-0000-4000-8000-000000000009";
const SYNTHETIC_APPROVAL_ID = "a0000000-0000-4000-8000-00000000000a";

// ─── Synthetic Factories ──────────────────────────────────────────────────────

const makeContext = (overrides: Partial<GapAnalysisContext> = {}): GapAnalysisContext => ({
  organizationId: SYNTHETIC_ORG_ID,
  assessmentId: SYNTHETIC_ASSESSMENT_ID,
  actorId: SYNTHETIC_ACTOR_ID,
  traceId: SYNTHETIC_TRACE_ID,
  ...overrides,
});

const makeSoaVersion = (overrides: Partial<SoaVersionResponse> = {}): SoaVersionResponse => ({
  soa_version_id: SYNTHETIC_SOA_VERSION_ID,
  organization_id: SYNTHETIC_ORG_ID,
  assessment_id: SYNTHETIC_ASSESSMENT_ID,
  version_number: 1,
  status: "approved",
  source_framework_id: SYNTHETIC_FRAMEWORK_ID,
  scf_version_id: SYNTHETIC_SCF_VERSION_ID,
  created_by: SYNTHETIC_ACTOR_ID,
  created_at: "2026-01-01T00:00:00Z",
  trace_id: SYNTHETIC_TRACE_ID,
  metadata: {},
  ...overrides,
});

const makeSoaItem = (overrides: Partial<SoaItemResponse> = {}): SoaItemResponse => ({
  soa_item_id: SYNTHETIC_SOA_ITEM_ID,
  organization_id: SYNTHETIC_ORG_ID,
  assessment_id: SYNTHETIC_ASSESSMENT_ID,
  soa_version_id: SYNTHETIC_SOA_VERSION_ID,
  framework_id: SYNTHETIC_FRAMEWORK_ID,
  framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
  scf_version_id: SYNTHETIC_SCF_VERSION_ID,
  scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
  applicability_status: "applicable",
  implementation_status: "not_assessed",
  evidence_coverage: "not_checked",
  confidence_score: 0,
  requires_user_validation: false,
  mapping_status: "official_mapping",
  responsibility_type: "internal",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeEvidenceFinding = (overrides: Partial<EvidenceFindingResponse> = {}): EvidenceFindingResponse => ({
  evidence_finding_id: crypto.randomUUID(),
  organization_id: SYNTHETIC_ORG_ID,
  assessment_id: SYNTHETIC_ASSESSMENT_ID,
  soa_version_id: SYNTHETIC_SOA_VERSION_ID,
  soa_item_id: SYNTHETIC_SOA_ITEM_ID,
  framework_id: SYNTHETIC_FRAMEWORK_ID,
  framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
  scf_version_id: SYNTHETIC_SCF_VERSION_ID,
  evidence_strength: "absent",
  evidence_status: "not_evidenced",
  evidence_summary: "Synthetic: no evidence found.",
  evidence_limitations: ["Absence of evidence is not evidence of non-implementation."],
  confidence_score: 0,
  trace_id: SYNTHETIC_TRACE_ID,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeKbResult = (overrides: Partial<KbSearchResult> = {}): KbSearchResult => ({
  document_id: crypto.randomUUID(),
  chunk_id: crypto.randomUUID(),
  snippet: "Synthetic evidence snippet for testing purposes.",
  score: 0.9,
  document_type: "policy",
  retrieval_method: "semantic",
  ...overrides,
} as KbSearchResult);

/**
 * Creates a minimal GapAnalysisDependencies with in-memory repositories
 * and mock SoA dependencies. No real services or DBs.
 */
const makeDeps = (overrides: Partial<GapAnalysisDependencies> = {}): GapAnalysisDependencies => {
  const repositories = overrides.repositories ?? createInMemoryGapAnalysisRepositories();

  // Minimal mock for soa dependencies
  const soaVersions = new Map<string, SoaVersionResponse>();
  const soaItems = new Map<string, SoaItemResponse[]>();

  const soa = {
    repositories: {
      versions: {
        save: vi.fn(async (v: SoaVersionResponse) => { soaVersions.set(v.soa_version_id, v); }),
        update: vi.fn(async (v: SoaVersionResponse) => { soaVersions.set(v.soa_version_id, v); }),
        get: vi.fn(async (id: string, _orgId: string) => soaVersions.get(id) ?? null),
        listByAssessment: vi.fn(async () => [...soaVersions.values()]),
        withOrganization: vi.fn(),
      },
      items: {
        save: vi.fn(),
        update: vi.fn(),
        get: vi.fn(async (id: string, _orgId: string) => {
          for (const items of soaItems.values()) {
            const found = items.find((i) => i.soa_item_id === id);
            if (found) return found;
          }
          return null;
        }),
        listByVersion: vi.fn(async (versionId: string, _orgId: string) => soaItems.get(versionId) ?? []),
        withOrganization: vi.fn(),
      },
      scopes: { save: vi.fn(), get: vi.fn(), update: vi.fn(), listByAssessment: vi.fn(), withOrganization: vi.fn() },
    },
    _soaVersions: soaVersions,
    _soaItems: soaItems,
  } as unknown as GapAnalysisDependencies["soa"];

  return {
    repositories,
    soa,
    ...overrides,
  };
};

/**
 * Seeds an approved SoA version and items into mock dependencies.
 */
const seedApprovedSoa = (
  deps: GapAnalysisDependencies,
  soaVersion?: SoaVersionResponse,
  items?: SoaItemResponse[],
) => {
  const version = soaVersion ?? makeSoaVersion();
  const soaItemsList = items ?? [makeSoaItem()];
  const soa = deps.soa as unknown as {
    _soaVersions: Map<string, SoaVersionResponse>;
    _soaItems: Map<string, SoaItemResponse[]>;
  };
  soa._soaVersions.set(version.soa_version_id, version);
  soa._soaItems.set(version.soa_version_id, soaItemsList);
  return { version, items: soaItemsList };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ERROR GUARDS — assertContext, assertActor, GapAnalysisWorkflowError
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Guards", () => {
  describe("assertContext", () => {
    it("throws TENANT_CONTEXT_REQUIRED when organizationId is missing", () => {
      expect(() =>
        assertContext({ assessmentId: SYNTHETIC_ASSESSMENT_ID, traceId: SYNTHETIC_TRACE_ID }),
      ).toThrow("TENANT_CONTEXT_REQUIRED");
    });

    it("throws TENANT_CONTEXT_REQUIRED when assessmentId is missing", () => {
      expect(() =>
        assertContext({ organizationId: SYNTHETIC_ORG_ID, traceId: SYNTHETIC_TRACE_ID }),
      ).toThrow("TENANT_CONTEXT_REQUIRED");
    });

    it("throws TENANT_CONTEXT_REQUIRED when traceId is missing", () => {
      expect(() =>
        assertContext({ organizationId: SYNTHETIC_ORG_ID, assessmentId: SYNTHETIC_ASSESSMENT_ID }),
      ).toThrow("TENANT_CONTEXT_REQUIRED");
    });

    it("passes when all context fields are present", () => {
      expect(() =>
        assertContext({
          organizationId: SYNTHETIC_ORG_ID,
          assessmentId: SYNTHETIC_ASSESSMENT_ID,
          traceId: SYNTHETIC_TRACE_ID,
        }),
      ).not.toThrow();
    });
  });

  describe("assertActor", () => {
    it("throws ACTOR_REQUIRED when actorId is missing", () => {
      expect(() => assertActor({})).toThrow("ACTOR_REQUIRED");
    });

    it("passes when actorId is present", () => {
      expect(() => assertActor({ actorId: SYNTHETIC_ACTOR_ID })).not.toThrow();
    });
  });

  describe("GapAnalysisWorkflowError", () => {
    it("includes code and message in error message", () => {
      const error = new GapAnalysisWorkflowError("TEST_CODE", "Test message");
      expect(error.message).toBe("TEST_CODE: Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.name).toBe("GapAnalysisWorkflowError");
    });

    it("stores details", () => {
      const error = new GapAnalysisWorkflowError("X", "msg", { key: "val" });
      expect(error.details).toEqual({ key: "val" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GAP DRAFT CREATION — GapDraftService
// ═══════════════════════════════════════════════════════════════════════════════

describe("GapDraftService", () => {
  let deps: GapAnalysisDependencies;
  let service: GapDraftService;
  const context = makeContext();

  beforeEach(() => {
    deps = makeDeps();
    service = new GapDraftService(deps);
  });

  describe("createGapAnalysisDraft", () => {
    it("creates a draft version with correct fields", async () => {
      seedApprovedSoa(deps);

      const draft = await service.createGapAnalysisDraft(
        SYNTHETIC_ASSESSMENT_ID,
        SYNTHETIC_SOA_VERSION_ID,
        context,
      );

      expect(draft.status).toBe("draft");
      expect(draft.organization_id).toBe(SYNTHETIC_ORG_ID);
      expect(draft.assessment_id).toBe(SYNTHETIC_ASSESSMENT_ID);
      expect(draft.source_soa_version_id).toBe(SYNTHETIC_SOA_VERSION_ID);
      expect(draft.framework_id).toBe(SYNTHETIC_FRAMEWORK_ID);
      expect(draft.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
      expect(draft.created_by).toBe(SYNTHETIC_ACTOR_ID);
      expect(draft.trace_id).toBe(SYNTHETIC_TRACE_ID);
      expect(draft.version_number).toBe(1);
      expect(draft.gap_analysis_version_id).toBeDefined();
    });

    it("creates findings for each SoA item", async () => {
      const items = [
        makeSoaItem({ soa_item_id: "70000000-0000-4000-8000-000000000010" }),
        makeSoaItem({ soa_item_id: "70000000-0000-4000-8000-000000000011" }),
        makeSoaItem({ soa_item_id: "70000000-0000-4000-8000-000000000012" }),
      ];
      seedApprovedSoa(deps, undefined, items);

      const draft = await service.createGapAnalysisDraft(
        SYNTHETIC_ASSESSMENT_ID,
        SYNTHETIC_SOA_VERSION_ID,
        context,
      );

      const findings = await service.listGapFindings(
        draft.gap_analysis_version_id,
        {},
        context,
      );

      expect(findings).toHaveLength(3);
      // Each finding has sequential GAP codes
      expect(findings.map((f) => f.gap_code).sort()).toEqual(["GAP-001", "GAP-002", "GAP-003"]);
    });

    it("increments version_number for subsequent drafts", async () => {
      seedApprovedSoa(deps);

      const draft1 = await service.createGapAnalysisDraft(
        SYNTHETIC_ASSESSMENT_ID,
        SYNTHETIC_SOA_VERSION_ID,
        context,
      );
      expect(draft1.version_number).toBe(1);

      const draft2 = await service.createGapAnalysisDraft(
        SYNTHETIC_ASSESSMENT_ID,
        SYNTHETIC_SOA_VERSION_ID,
        context,
      );
      expect(draft2.version_number).toBe(2);
    });

    it("throws APPROVED_SOA_REQUIRED when SoA is not approved", async () => {
      seedApprovedSoa(deps, makeSoaVersion({ status: "draft" }));

      await expect(
        service.createGapAnalysisDraft(
          SYNTHETIC_ASSESSMENT_ID,
          SYNTHETIC_SOA_VERSION_ID,
          context,
        ),
      ).rejects.toThrow("APPROVED_SOA_REQUIRED");
    });

    it("throws TENANT_CONTEXT_MISMATCH when assessment_id does not match context", async () => {
      seedApprovedSoa(deps);

      await expect(
        service.createGapAnalysisDraft(
          "99999999-0000-4000-8000-000000000099",
          SYNTHETIC_SOA_VERSION_ID,
          context,
        ),
      ).rejects.toThrow("TENANT_CONTEXT_MISMATCH");
    });

    it("throws TENANT_CONTEXT_REQUIRED when context is incomplete", async () => {
      seedApprovedSoa(deps);

      await expect(
        service.createGapAnalysisDraft(
          SYNTHETIC_ASSESSMENT_ID,
          SYNTHETIC_SOA_VERSION_ID,
          makeContext({ organizationId: undefined as unknown as string }),
        ),
      ).rejects.toThrow("TENANT_CONTEXT_REQUIRED");
    });

    it("throws ACTOR_REQUIRED when actorId is missing", async () => {
      seedApprovedSoa(deps);

      await expect(
        service.createGapAnalysisDraft(
          SYNTHETIC_ASSESSMENT_ID,
          SYNTHETIC_SOA_VERSION_ID,
          makeContext({ actorId: undefined }),
        ),
      ).rejects.toThrow("ACTOR_REQUIRED");
    });
  });

  describe("generateGapFindingForSoaItem — assessment logic", () => {
    it("not_applicable with rationale → not_applicable_justified", async () => {
      const item = makeSoaItem({
        applicability_status: "not_applicable",
        non_applicability_rationale: "Synthetic justified exclusion",
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, undefined, context,
      );

      expect(finding.assessment_status).toBe("not_applicable_justified");
      expect(finding.gap_type).toBe("not_applicable");
      expect(finding.severity).toBe("informational");
      expect(finding.requires_user_validation).toBe(false);
    });

    it("not_applicable without rationale → not_applicable_not_justified", async () => {
      const item = makeSoaItem({
        applicability_status: "not_applicable",
        non_applicability_rationale: undefined,
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, undefined, context,
      );

      expect(finding.assessment_status).toBe("not_applicable_not_justified");
      expect(finding.requires_user_validation).toBe(true);
    });

    it("no evidence → not_evidenced / evidence_gap / medium", async () => {
      const item = makeSoaItem();

      const finding = await service.generateGapFindingForSoaItem(
        item, undefined, context,
      );

      expect(finding.assessment_status).toBe("not_evidenced");
      expect(finding.gap_type).toBe("evidence_gap");
      expect(finding.severity).toBe("medium");
      expect(finding.requires_user_validation).toBe(true);
    });

    it("absent evidence_strength → not_evidenced", async () => {
      const item = makeSoaItem();
      const evidence = makeEvidenceFinding({
        evidence_strength: "absent",
        evidence_status: "not_evidenced",
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.assessment_status).toBe("not_evidenced");
    });

    it("conflicting evidence → requires_validation", async () => {
      const item = makeSoaItem();
      const evidence = makeEvidenceFinding({
        evidence_strength: "conflicting",
        evidence_status: "conflicting",
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.assessment_status).toBe("requires_validation");
      expect(finding.gap_type).toBe("evidence_gap");
      expect(finding.requires_user_validation).toBe(true);
    });

    it("partial evidence → partially_met / documentation_gap", async () => {
      const item = makeSoaItem();
      const evidence = makeEvidenceFinding({
        evidence_strength: "partial",
        evidence_status: "candidate",
        confidence_score: 0.7,
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.assessment_status).toBe("partially_met");
      expect(finding.gap_type).toBe("documentation_gap");
      expect(finding.severity).toBe("low");
    });

    it("strong evidence with high confidence → met / no_gap", async () => {
      const item = makeSoaItem();
      const evidence = makeEvidenceFinding({
        evidence_strength: "strong",
        evidence_status: "candidate",
        confidence_score: 0.85,
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.assessment_status).toBe("met");
      expect(finding.gap_type).toBe("no_gap");
      expect(finding.severity).toBe("informational");
      expect(finding.requires_user_validation).toBe(false);
    });

    it("strong evidence with low confidence → requires_validation (fallback)", async () => {
      const item = makeSoaItem();
      const evidence = makeEvidenceFinding({
        evidence_strength: "strong",
        evidence_status: "candidate",
        confidence_score: 0.5,
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.assessment_status).toBe("requires_validation");
      expect(finding.requires_user_validation).toBe(true);
    });

    it("preserves evidence_finding_id link when evidence is provided", async () => {
      const item = makeSoaItem();
      const evidenceId = "ef000000-0000-4000-8000-000000000001";
      const evidence = makeEvidenceFinding({
        evidence_finding_id: evidenceId,
        evidence_strength: "partial",
        evidence_status: "candidate",
      });

      const finding = await service.generateGapFindingForSoaItem(
        item, evidence, context,
      );

      expect(finding.evidence_finding_id).toBe(evidenceId);
    });

    it("carries all traceability fields (organization_id, assessment_id, framework_id, scf_control_id)", async () => {
      const item = makeSoaItem();

      const finding = await service.generateGapFindingForSoaItem(
        item, undefined, context,
      );

      expect(finding.organization_id).toBe(SYNTHETIC_ORG_ID);
      expect(finding.assessment_id).toBe(SYNTHETIC_ASSESSMENT_ID);
      expect(finding.framework_id).toBe(SYNTHETIC_FRAMEWORK_ID);
      expect(finding.scf_control_id).toBe(SYNTHETIC_SCF_CONTROL_ID);
      expect(finding.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
      expect(finding.framework_requirement_id).toBe(SYNTHETIC_REQUIREMENT_ID);
    });

    it("omits scf_control_id when SoA item has none", async () => {
      const item = makeSoaItem({ scf_control_id: undefined });

      const finding = await service.generateGapFindingForSoaItem(
        item, undefined, context,
      );

      expect(finding.scf_control_id).toBeUndefined();
    });
  });

  describe("listGapFindings — filtering", () => {
    it("filters by assessment_status", async () => {
      const items = [
        makeSoaItem({
          soa_item_id: "70000000-0000-4000-8000-000000000020",
          applicability_status: "not_applicable",
          non_applicability_rationale: "Justified",
        }),
        makeSoaItem({
          soa_item_id: "70000000-0000-4000-8000-000000000021",
        }),
      ];
      seedApprovedSoa(deps, undefined, items);

      const draft = await service.createGapAnalysisDraft(
        SYNTHETIC_ASSESSMENT_ID,
        SYNTHETIC_SOA_VERSION_ID,
        context,
      );

      const notEvidenced = await service.listGapFindings(
        draft.gap_analysis_version_id,
        { assessment_status: "not_evidenced" },
        context,
      );
      const naJustified = await service.listGapFindings(
        draft.gap_analysis_version_id,
        { assessment_status: "not_applicable_justified" },
        context,
      );

      expect(notEvidenced).toHaveLength(1);
      expect(naJustified).toHaveLength(1);
    });

    it("returns empty array for non-existent version", async () => {
      const findings = await service.listGapFindings(
        "99999999-0000-4000-8000-000000000099",
        {},
        context,
      );
      expect(findings).toEqual([]);
    });
  });

  describe("getGapFinding", () => {
    it("throws GAP_FINDING_NOT_FOUND for non-existent finding", async () => {
      await expect(
        service.getGapFinding("99999999-0000-4000-8000-000000000099", context),
      ).rejects.toThrow("GAP_FINDING_NOT_FOUND");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MCR FLAG VALIDATION — GapDraftService MCR enrichment
// ═══════════════════════════════════════════════════════════════════════════════

describe("MCR Flag Validation", () => {
  const context = makeContext();

  it("sets is_mcr_gap=true when framework requirement matches MCR list", async () => {
    const deps = makeDeps({
      scf: {
        frameworks: {
          listMcrRequirements: vi.fn(async () => [
            { id: SYNTHETIC_REQUIREMENT_ID, name: "Synthetic MCR Requirement" },
          ]),
        },
      } as unknown as GapAnalysisDependencies["scf"],
    });
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.is_mcr_gap).toBe(true);
  });

  it("sets is_mcr_gap=false when requirement is not in MCR list", async () => {
    const deps = makeDeps({
      scf: {
        frameworks: {
          listMcrRequirements: vi.fn(async () => [
            { id: "other-requirement-id", name: "Other" },
          ]),
        },
      } as unknown as GapAnalysisDependencies["scf"],
    });
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.is_mcr_gap).toBe(false);
  });

  it("defaults is_mcr_gap=false when SCF service is unavailable (non-blocking)", async () => {
    const deps = makeDeps({
      scf: {
        frameworks: {
          listMcrRequirements: vi.fn(async () => {
            throw new Error("SCF service unavailable");
          }),
        },
      } as unknown as GapAnalysisDependencies["scf"],
    });
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.is_mcr_gap).toBe(false);
  });

  it("defaults is_mcr_gap=false when scf dependency is absent", async () => {
    const deps = makeDeps({ scf: undefined });
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.is_mcr_gap).toBe(false);
  });

  it("defaults is_mcr_gap=false when framework_id is missing on SoA item", async () => {
    const deps = makeDeps({
      scf: {
        frameworks: {
          listMcrRequirements: vi.fn(async () => [
            { id: SYNTHETIC_REQUIREMENT_ID, name: "MCR" },
          ]),
        },
      } as unknown as GapAnalysisDependencies["scf"],
    });
    const service = new GapDraftService(deps);
    const item = makeSoaItem({ framework_id: undefined as unknown as string });

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.is_mcr_gap).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EVIDENCE CLASSIFICATION — EvidenceClassificationService
// ═══════════════════════════════════════════════════════════════════════════════

describe("EvidenceClassificationService", () => {
  const classificationService = new EvidenceClassificationService();
  const context = makeContext();
  const item = makeSoaItem();

  describe("classifyCandidateEvidence", () => {
    it("returns absent when no KB results", async () => {
      const result = await classificationService.classifyCandidateEvidence(
        item, [], context,
      );

      expect(result.evidence_strength).toBe("absent");
      expect(result.evidence_status).toBe("not_evidenced");
      expect(result.confidence_score).toBe(0);
      expect(result.evidence_limitations).toContain(
        "Absence of evidence is not evidence of non-implementation.",
      );
    });

    it("returns conflicting when conflict signal is detected", async () => {
      const results = [makeKbResult({ snippet: "This control is NOT implemented." })];

      const result = await classificationService.classifyCandidateEvidence(
        item, results, context,
      );

      expect(result.evidence_strength).toBe("conflicting");
      expect(result.evidence_status).toBe("conflicting");
      expect(result.confidence_score).toBe(0.55);
    });

    it("returns strong when best score >= 0.85 and >=2 results", async () => {
      const results = [
        makeKbResult({ score: 0.90 }),
        makeKbResult({ score: 0.87 }),
      ];

      const result = await classificationService.classifyCandidateEvidence(
        item, results, context,
      );

      expect(result.evidence_strength).toBe("strong");
      expect(result.evidence_status).toBe("candidate");
      expect(result.confidence_score).toBe(0.82);
    });

    it("returns partial when best score >= 0.55 but not strong", async () => {
      const results = [makeKbResult({ score: 0.70 })];

      const result = await classificationService.classifyCandidateEvidence(
        item, results, context,
      );

      expect(result.evidence_strength).toBe("partial");
      expect(result.evidence_status).toBe("candidate");
      expect(result.confidence_score).toBe(0.68);
    });

    it("returns weak when best score < 0.55", async () => {
      const results = [makeKbResult({ score: 0.30 })];

      const result = await classificationService.classifyCandidateEvidence(
        item, results, context,
      );

      expect(result.evidence_strength).toBe("weak");
      expect(result.evidence_status).toBe("insufficient");
      expect(result.confidence_score).toBe(0.35);
    });

    it("treats single high score as partial (not strong) since only 1 result", async () => {
      const results = [makeKbResult({ score: 0.95 })];

      const result = await classificationService.classifyCandidateEvidence(
        item, results, context,
      );

      // Only 1 result, so even with score >= 0.85, it's partial not strong
      expect(result.evidence_strength).toBe("partial");
    });
  });

  describe("determineEvidenceStrength", () => {
    it("returns absent for empty results", () => {
      expect(classificationService.determineEvidenceStrength([])).toBe("absent");
    });

    it("detects conflicting signals", () => {
      const results = [makeKbResult({ snippet: "Conflicting data found." })];
      expect(classificationService.determineEvidenceStrength(results)).toBe("conflicting");
    });
  });

  describe("detectConflictingEvidence", () => {
    it("returns true for conflict keywords", () => {
      expect(
        classificationService.detectConflictingEvidence([
          makeKbResult({ snippet: "This policy has an exception." }),
        ]),
      ).toBe(true);
    });

    it("returns false for clean snippets", () => {
      expect(
        classificationService.detectConflictingEvidence([
          makeKbResult({ snippet: "Policy implemented as required." }),
        ]),
      ).toBe(false);
    });
  });

  describe("summarizeEvidence", () => {
    it("returns 'No candidate evidence found.' for empty results", () => {
      expect(classificationService.summarizeEvidence([])).toBe(
        "No candidate evidence found.",
      );
    });

    it("returns count-based summary for non-empty results", () => {
      const results = [makeKbResult(), makeKbResult()];
      expect(classificationService.summarizeEvidence(results)).toBe(
        "2 candidate evidence source(s) found.",
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. VALIDATION RULES — GapValidationService
// ═══════════════════════════════════════════════════════════════════════════════

describe("GapValidationService", () => {
  const context = makeContext();

  it("reports not_met without gap_rationale as blocking error", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    const finding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
      gap_code: "GAP-001",
      assessment_status: "not_met",
      gap_type: "implementation_gap",
      severity: "high",
      is_mcr_gap: false,
      gap_summary: "Synthetic gap summary",
      // gap_rationale intentionally omitted
      confidence_score: 0.5,
      requires_user_validation: true,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });
    await deps.repositories.gapFindings.saveMany([finding]);

    const validationService = new GapValidationService(deps);
    const result = await validationService.validateGapAnalysisForReview(
      versionId,
      context,
    );

    expect(result.valid).toBe(false);
    expect(result.blocking_errors.length).toBeGreaterThan(0);
    expect(result.blocking_errors[0]).toContain("gap_rationale");
  });

  it("reports met without evidence AND rationale as blocking error", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    const finding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      // no scf_control_id and no evidence_finding_id, no gap_rationale
      gap_code: "GAP-001",
      assessment_status: "met",
      gap_type: "no_gap",
      severity: "informational",
      is_mcr_gap: false,
      gap_summary: "Synthetic met finding",
      confidence_score: 0.9,
      requires_user_validation: false,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });
    await deps.repositories.gapFindings.saveMany([finding]);

    const validationService = new GapValidationService(deps);
    const result = await validationService.validateGapAnalysisForReview(
      versionId,
      context,
    );

    expect(result.valid).toBe(false);
    // Should have errors for both missing evidence/rationale AND missing scf_control_id
    expect(result.blocking_errors.length).toBeGreaterThanOrEqual(2);
  });

  it("reports not_evidenced without evidence_gap type as blocking error", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    const finding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      gap_code: "GAP-001",
      assessment_status: "not_evidenced",
      gap_type: "documentation_gap", // wrong — should be evidence_gap
      severity: "medium",
      is_mcr_gap: false,
      gap_summary: "Synthetic gap",
      confidence_score: 0,
      requires_user_validation: true,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });
    await deps.repositories.gapFindings.saveMany([finding]);

    const validationService = new GapValidationService(deps);
    const result = await validationService.validateGapAnalysisForReview(
      versionId,
      context,
    );

    expect(result.valid).toBe(false);
    expect(result.blocking_errors.some((e) => e.includes("evidence_gap"))).toBe(true);
  });

  it("passes validation for a well-formed met finding", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    const finding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
      evidence_finding_id: crypto.randomUUID(),
      gap_code: "GAP-001",
      assessment_status: "met",
      gap_type: "no_gap",
      severity: "informational",
      is_mcr_gap: false,
      gap_summary: "Control is met.",
      confidence_score: 0.9,
      requires_user_validation: false,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });
    await deps.repositories.gapFindings.saveMany([finding]);

    const validationService = new GapValidationService(deps);
    const result = await validationService.validateGapAnalysisForReview(
      versionId,
      context,
    );

    expect(result.valid).toBe(true);
    expect(result.blocking_errors).toHaveLength(0);
  });

  it("emits warning when requires_validation findings exist", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    const finding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
      evidence_finding_id: crypto.randomUUID(),
      gap_code: "GAP-001",
      assessment_status: "requires_validation",
      gap_type: "evidence_gap",
      severity: "low",
      is_mcr_gap: false,
      gap_summary: "Needs validation.",
      confidence_score: 0.5,
      requires_user_validation: true,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });
    await deps.repositories.gapFindings.saveMany([finding]);

    const validationService = new GapValidationService(deps);
    const result = await validationService.validateGapAnalysisForReview(
      versionId,
      context,
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("validation");
  });

  describe("detectMissingEvidenceLinks", () => {
    it("returns findings without evidence_finding_id (except NA justified)", async () => {
      const deps = makeDeps();
      const versionId = crypto.randomUUID();
      const findingWithEvidence: GapFindingResponse = {
        gap_finding_id: "f1000000-0000-4000-8000-000000000001",
        organization_id: SYNTHETIC_ORG_ID,
        assessment_id: SYNTHETIC_ASSESSMENT_ID,
        gap_analysis_version_id: versionId,
        soa_version_id: SYNTHETIC_SOA_VERSION_ID,
        soa_item_id: SYNTHETIC_SOA_ITEM_ID,
        framework_id: SYNTHETIC_FRAMEWORK_ID,
        framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
        scf_version_id: SYNTHETIC_SCF_VERSION_ID,
        scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
        evidence_finding_id: crypto.randomUUID(),
        gap_code: "GAP-001",
        assessment_status: "met",
        gap_type: "no_gap",
        severity: "informational",
        is_mcr_gap: false,
        gap_summary: "Has evidence.",
        confidence_score: 0.9,
        requires_user_validation: false,
        responsibility_type: "internal",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      const findingWithout: GapFindingResponse = {
        ...findingWithEvidence,
        gap_finding_id: "f2000000-0000-4000-8000-000000000002",
        soa_item_id: "70000000-0000-4000-8000-000000000030",
        evidence_finding_id: undefined,
        assessment_status: "not_evidenced",
        gap_type: "evidence_gap",
        gap_code: "GAP-002",
      };
      const findingNA: GapFindingResponse = {
        ...findingWithEvidence,
        gap_finding_id: "f3000000-0000-4000-8000-000000000003",
        soa_item_id: "70000000-0000-4000-8000-000000000031",
        evidence_finding_id: undefined,
        assessment_status: "not_applicable_justified",
        gap_type: "not_applicable",
        gap_code: "GAP-003",
      };

      await deps.repositories.gapFindings.saveMany([
        findingWithEvidence,
        findingWithout,
        findingNA,
      ]);

      const validationService = new GapValidationService(deps);
      const missing = await validationService.detectMissingEvidenceLinks(
        versionId,
        context,
      );

      // Only findingWithout should be flagged; NA justified is excluded
      expect(missing).toContain("f2000000-0000-4000-8000-000000000002");
      expect(missing).not.toContain("f3000000-0000-4000-8000-000000000003");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. REVIEW WORKFLOW — GapReviewService
// ═══════════════════════════════════════════════════════════════════════════════

describe("GapReviewService", () => {
  const context = makeContext();

  const seedDraftGapVersion = async (deps: GapAnalysisDependencies) => {
    const versionId = crypto.randomUUID();
    const findingId = crypto.randomUUID();
    const version = {
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft" as const,
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    };
    const finding: GapFindingResponse = {
      gap_finding_id: findingId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      gap_analysis_version_id: versionId,
      soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      soa_item_id: SYNTHETIC_SOA_ITEM_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
      evidence_finding_id: crypto.randomUUID(),
      gap_code: "GAP-001",
      assessment_status: "not_evidenced",
      gap_type: "evidence_gap",
      severity: "medium",
      is_mcr_gap: false,
      gap_summary: "Synthetic: not evidenced.",
      confidence_score: 0,
      requires_user_validation: true,
      responsibility_type: "internal",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    await deps.repositories.gapVersions.save(version);
    await deps.repositories.gapFindings.saveMany([finding]);
    return { version, finding };
  };

  describe("updateGapFinding", () => {
    it("updates a finding in a draft version", async () => {
      const deps = makeDeps();
      const { finding } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      const updated = await service.updateGapFinding(
        finding.gap_finding_id,
        { severity: "high", gap_rationale: "Synthetic: confirmed not met" },
        context,
      );

      expect(updated.severity).toBe("high");
      expect(updated.gap_rationale).toBe("Synthetic: confirmed not met");
      expect(updated.updated_at).not.toBe(finding.updated_at);
    });

    it("blocks updating not_met without gap_rationale", async () => {
      const deps = makeDeps();
      const { finding } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      await expect(
        service.updateGapFinding(
          finding.gap_finding_id,
          { assessment_status: "not_met" },
          context,
        ),
      ).rejects.toThrow("GAP_RATIONALE_REQUIRED");
    });

    it("blocks updates on approved versions (immutability)", async () => {
      const deps = makeDeps();
      const { version, finding } = await seedDraftGapVersion(deps);
      // Mark version as approved
      await deps.repositories.gapVersions.update({
        ...version,
        status: "approved",
      });
      const service = new GapReviewService(deps);

      await expect(
        service.updateGapFinding(
          finding.gap_finding_id,
          { severity: "critical" },
          context,
        ),
      ).rejects.toThrow("GAP_ANALYSIS_IMMUTABLE");
    });

    it("throws GAP_FINDING_NOT_FOUND for non-existent finding", async () => {
      const deps = makeDeps();
      await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      await expect(
        service.updateGapFinding(
          "99999999-0000-4000-8000-000000000099",
          { severity: "high" },
          context,
        ),
      ).rejects.toThrow("GAP_FINDING_NOT_FOUND");
    });

    it("throws ACTOR_REQUIRED when actorId is missing", async () => {
      const deps = makeDeps();
      const { finding } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      await expect(
        service.updateGapFinding(
          finding.gap_finding_id,
          { severity: "high" },
          makeContext({ actorId: undefined }),
        ),
      ).rejects.toThrow("ACTOR_REQUIRED");
    });

    it("recalculates roc_determination when severity is patched", async () => {
      const deps = makeDeps();
      const { finding } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      const updated = await service.updateGapFinding(
        finding.gap_finding_id,
        { severity: "critical" },
        context,
      );

      // critical + not_evidenced → material_weakness
      expect(updated.roc_determination).toBe("material_weakness");
    });

    it("recalculates risk scores when severity changes", async () => {
      const deps = makeDeps();
      const { finding } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      const updated = await service.updateGapFinding(
        finding.gap_finding_id,
        { severity: "critical" },
        context,
      );

      expect(updated.inherent_risk_score).toBeDefined();
      expect(updated.residual_risk_score).toBeDefined();
    });
  });

  describe("submitGapAnalysisForReview", () => {
    it("transitions draft to under_review", async () => {
      const deps = makeDeps();
      const { version } = await seedDraftGapVersion(deps);
      const service = new GapReviewService(deps);

      // Validation passes for evidence_gap status
      const submitted = await service.submitGapAnalysisForReview(
        version.gap_analysis_version_id,
        context,
      );

      expect(submitted.status).toBe("under_review");
      expect(submitted.submitted_for_review_at).toBeDefined();
    });

    it("allows submission with exception_rationale when validation fails", async () => {
      const deps = makeDeps();
      const versionId = crypto.randomUUID();
      // Create finding with validation error (not_met without rationale)
      await deps.repositories.gapVersions.save({
        gap_analysis_version_id: versionId,
        organization_id: SYNTHETIC_ORG_ID,
        assessment_id: SYNTHETIC_ASSESSMENT_ID,
        version_number: 1,
        status: "draft",
        source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
        framework_id: SYNTHETIC_FRAMEWORK_ID,
        scf_version_id: SYNTHETIC_SCF_VERSION_ID,
        created_by: SYNTHETIC_ACTOR_ID,
        created_at: "2026-01-01T00:00:00Z",
        trace_id: SYNTHETIC_TRACE_ID,
        metadata: {},
      });
      await deps.repositories.gapFindings.saveMany([
        {
          gap_finding_id: crypto.randomUUID(),
          organization_id: SYNTHETIC_ORG_ID,
          assessment_id: SYNTHETIC_ASSESSMENT_ID,
          gap_analysis_version_id: versionId,
          soa_version_id: SYNTHETIC_SOA_VERSION_ID,
          soa_item_id: SYNTHETIC_SOA_ITEM_ID,
          framework_id: SYNTHETIC_FRAMEWORK_ID,
          framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
          scf_version_id: SYNTHETIC_SCF_VERSION_ID,
          gap_code: "GAP-001",
          assessment_status: "not_met",
          gap_type: "implementation_gap",
          severity: "high",
          is_mcr_gap: false,
          gap_summary: "Not met.",
          confidence_score: 0.5,
          requires_user_validation: true,
          responsibility_type: "internal",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          // gap_rationale intentionally omitted → validation fails
        } as GapFindingResponse,
      ]);

      const service = new GapReviewService(deps);

      // Without exception rationale → should throw
      await expect(
        service.submitGapAnalysisForReview(versionId, context),
      ).rejects.toThrow("GAP_REVIEW_BLOCKED");

      // With exception rationale → should pass
      const submitted = await service.submitGapAnalysisForReview(
        versionId,
        context,
        "Synthetic: acknowledged exception",
      );

      expect(submitted.status).toBe("under_review");
      expect(submitted.metadata?.exception_rationale).toBe(
        "Synthetic: acknowledged exception",
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. APPROVAL GATES — GapApprovalService
// ═══════════════════════════════════════════════════════════════════════════════

describe("GapApprovalService", () => {
  const context = makeContext();

  const seedUnderReviewGap = async (deps: GapAnalysisDependencies) => {
    const versionId = crypto.randomUUID();
    const version = {
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "under_review" as const,
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      submitted_for_review_at: "2026-01-02T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    };
    await deps.repositories.gapVersions.save(version);
    // Add a valid finding
    await deps.repositories.gapFindings.saveMany([
      {
        gap_finding_id: crypto.randomUUID(),
        organization_id: SYNTHETIC_ORG_ID,
        assessment_id: SYNTHETIC_ASSESSMENT_ID,
        gap_analysis_version_id: versionId,
        soa_version_id: SYNTHETIC_SOA_VERSION_ID,
        soa_item_id: SYNTHETIC_SOA_ITEM_ID,
        framework_id: SYNTHETIC_FRAMEWORK_ID,
        framework_requirement_id: SYNTHETIC_REQUIREMENT_ID,
        scf_version_id: SYNTHETIC_SCF_VERSION_ID,
        scf_control_id: SYNTHETIC_SCF_CONTROL_ID,
        evidence_finding_id: crypto.randomUUID(),
        gap_code: "GAP-001",
        assessment_status: "met",
        gap_type: "no_gap",
        severity: "informational",
        is_mcr_gap: false,
        gap_summary: "Control met.",
        confidence_score: 0.9,
        requires_user_validation: false,
        responsibility_type: "internal",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    return { version, versionId };
  };

  it("approves under_review version with valid approval event", async () => {
    const deps = makeDeps();
    const { versionId } = await seedUnderReviewGap(deps);
    const service = new GapApprovalService(deps);

    const approved = await service.approveGapAnalysis(
      versionId,
      { approval_event_id: SYNTHETIC_APPROVAL_ID },
      context,
    );

    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe(SYNTHETIC_ACTOR_ID);
    expect(approved.approval_event_id).toBe(SYNTHETIC_APPROVAL_ID);
    expect(approved.approved_at).toBeDefined();
  });

  it("blocks approval without approval_event_id", async () => {
    const deps = makeDeps();
    const { versionId } = await seedUnderReviewGap(deps);
    const service = new GapApprovalService(deps);

    await expect(
      service.approveGapAnalysis(versionId, {}, context),
    ).rejects.toThrow("APPROVAL_EVENT_REQUIRED");
  });

  it("blocks approval of draft versions", async () => {
    const deps = makeDeps();
    const versionId = crypto.randomUUID();
    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: versionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "draft",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });

    const service = new GapApprovalService(deps);

    await expect(
      service.approveGapAnalysis(
        versionId,
        { approval_event_id: SYNTHETIC_APPROVAL_ID },
        context,
      ),
    ).rejects.toThrow("GAP_APPROVAL_BLOCKED");
  });

  it("blocks approval without actorId", async () => {
    const deps = makeDeps();
    const { versionId } = await seedUnderReviewGap(deps);
    const service = new GapApprovalService(deps);

    await expect(
      service.approveGapAnalysis(
        versionId,
        { approval_event_id: SYNTHETIC_APPROVAL_ID },
        makeContext({ actorId: undefined }),
      ),
    ).rejects.toThrow("ACTOR_REQUIRED");
  });

  it("supersedes previous approved versions", async () => {
    const deps = makeDeps();

    // Create first approved version
    const firstVersionId = crypto.randomUUID();
    await deps.repositories.gapVersions.save({
      gap_analysis_version_id: firstVersionId,
      organization_id: SYNTHETIC_ORG_ID,
      assessment_id: SYNTHETIC_ASSESSMENT_ID,
      version_number: 1,
      status: "approved",
      source_soa_version_id: SYNTHETIC_SOA_VERSION_ID,
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      created_by: SYNTHETIC_ACTOR_ID,
      created_at: "2026-01-01T00:00:00Z",
      trace_id: SYNTHETIC_TRACE_ID,
      metadata: {},
    });

    // Create second under_review version
    const { versionId: secondVersionId } = await seedUnderReviewGap(deps);

    const service = new GapApprovalService(deps);
    await service.approveGapAnalysis(
      secondVersionId,
      { approval_event_id: SYNTHETIC_APPROVAL_ID },
      context,
    );

    // First version should now be superseded
    const firstVersion = await deps.repositories.gapVersions.get(
      firstVersionId,
      SYNTHETIC_ORG_ID,
    );

    expect(firstVersion?.status).toBe("superseded");
    expect(firstVersion?.superseded_by).toBe(secondVersionId);
  });

  it("logs findings to ledger when ledger is available", async () => {
    const appendEvent = vi.fn(async () => {});
    const deps = makeDeps({
      ledger: { appendEvent } as unknown as GapAnalysisDependencies["ledger"],
    });
    const { versionId } = await seedUnderReviewGap(deps);
    const service = new GapApprovalService(deps);

    await service.approveGapAnalysis(
      versionId,
      { approval_event_id: SYNTHETIC_APPROVAL_ID },
      context,
    );

    expect(appendEvent).toHaveBeenCalled();
    const call = (appendEvent.mock.calls as unknown as Array<[Record<string, unknown>]>)[0]![0] as Record<string, unknown>;
    expect(call.eventType).toBe("finding_updated");
    expect(call.organizationId).toBe(SYNTHETIC_ORG_ID);
    expect(call.assessmentId).toBe(SYNTHETIC_ASSESSMENT_ID);
    expect(call.traceId).toBe(SYNTHETIC_TRACE_ID);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. RISK SCORE ENGINE — Pure functions
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Score Engine", () => {
  describe("categorizeRisk", () => {
    it("categorizes score <= 4 as low", () => {
      expect(categorizeRisk(1)).toBe("low");
      expect(categorizeRisk(4)).toBe("low");
    });

    it("categorizes score 5-9 as moderate", () => {
      expect(categorizeRisk(5)).toBe("moderate");
      expect(categorizeRisk(9)).toBe("moderate");
    });

    it("categorizes score 10-16 as high", () => {
      expect(categorizeRisk(10)).toBe("high");
      expect(categorizeRisk(16)).toBe("high");
    });

    it("categorizes score 17-25 as severe", () => {
      expect(categorizeRisk(17)).toBe("severe");
      expect(categorizeRisk(25)).toBe("severe");
    });

    it("categorizes score > 25 as extreme", () => {
      expect(categorizeRisk(26)).toBe("extreme");
      expect(categorizeRisk(36)).toBe("extreme");
    });
  });

  describe("deriveRocDetermination", () => {
    it("returns null for not_applicable statuses", () => {
      expect(deriveRocDetermination("high", "not_applicable_justified")).toBeNull();
      expect(deriveRocDetermination("high", "not_applicable_not_justified")).toBeNull();
    });

    it("returns strictly_conforms for met + no_gap", () => {
      expect(deriveRocDetermination("informational", "met", "no_gap")).toBe("strictly_conforms");
    });

    it("returns conforms for met without no_gap", () => {
      expect(deriveRocDetermination("informational", "met", "documentation_gap")).toBe("conforms");
    });

    it("returns material_weakness for critical + not_met", () => {
      expect(deriveRocDetermination("critical", "not_met")).toBe("material_weakness");
    });

    it("returns material_weakness for high + not_evidenced", () => {
      expect(deriveRocDetermination("high", "not_evidenced")).toBe("material_weakness");
    });

    it("returns significant_deficiency for high + partially_met", () => {
      expect(deriveRocDetermination("high", "partially_met")).toBe("significant_deficiency");
    });

    it("returns significant_deficiency for medium + not_met", () => {
      expect(deriveRocDetermination("medium", "not_met")).toBe("significant_deficiency");
    });

    it("returns conforms for low + not_met", () => {
      expect(deriveRocDetermination("low", "not_met")).toBe("conforms");
    });
  });

  describe("calculateRiskScore", () => {
    it("calculates inherent risk as IE × OL", () => {
      const result = calculateRiskScore({ impactValue: 4, likelihoodValue: 3 });
      expect(result.inherentRisk).toBe(12);
    });

    it("returns same inherent and residual when no control weight", () => {
      const result = calculateRiskScore({ impactValue: 3, likelihoodValue: 3 });
      expect(result.inherentRisk).toBe(9);
      expect(result.residualRisk).toBe(9);
      expect(result.mitigationFactor).toBe(0);
    });

    it("applies control weight and maturity factor", () => {
      const result = calculateRiskScore({
        impactValue: 4,
        likelihoodValue: 4,
        controlWeight: 0.8,
        maturityLevel: 3,
      });

      expect(result.inherentRisk).toBe(16);
      // mitigationFactor = min(0.9, 0.8 * (3/5)) = min(0.9, 0.48) = 0.48
      expect(result.mitigationFactor).toBe(0.48);
      // residualRisk = 16 * (1 - 0.48) = 16 * 0.52 = 8.32
      expect(result.residualRisk).toBe(8.32);
    });

    it("caps mitigation factor at 0.9", () => {
      const result = calculateRiskScore({
        impactValue: 5,
        likelihoodValue: 5,
        controlWeight: 1.0,
        maturityLevel: 5,
      });

      expect(result.mitigationFactor).toBe(0.9);
      // residualRisk = 25 * 0.1 = 2.5
      expect(result.residualRisk).toBe(2.5);
    });

    it("clamps input values to valid ranges", () => {
      const result = calculateRiskScore({ impactValue: 0, likelihoodValue: 10 });
      // Clamped: IE=1, OL=6
      expect(result.inherentRisk).toBe(6);
      expect(result.impactValue).toBe(1);
      expect(result.likelihoodValue).toBe(6);
    });
  });

  describe("severityToImpactEffect", () => {
    it("maps known severities", () => {
      expect(severityToImpactEffect("informational")).toBe(1);
      expect(severityToImpactEffect("low")).toBe(2);
      expect(severityToImpactEffect("medium")).toBe(3);
      expect(severityToImpactEffect("high")).toBe(4);
      expect(severityToImpactEffect("critical")).toBe(5);
    });
  });

  describe("likelihoodToOccurrenceLikelihood", () => {
    it("returns 3 (unlikely) for undefined", () => {
      expect(likelihoodToOccurrenceLikelihood(undefined)).toBe(3);
    });

    it("maps known likelihood strings", () => {
      expect(likelihoodToOccurrenceLikelihood("remote")).toBe(1);
      expect(likelihoodToOccurrenceLikelihood("likely")).toBe(5);
      expect(likelihoodToOccurrenceLikelihood("almost_certain")).toBe(6);
    });

    it("handles legacy mappings", () => {
      expect(likelihoodToOccurrenceLikelihood("low")).toBe(2);
      expect(likelihoodToOccurrenceLikelihood("medium")).toBe(3);
      expect(likelihoodToOccurrenceLikelihood("high")).toBe(4);
    });

    it("defaults to 3 for unknown strings", () => {
      expect(likelihoodToOccurrenceLikelihood("unknown_value")).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ROC DETERMINATION ON DRAFT — Gap findings include derived ROC
// ═══════════════════════════════════════════════════════════════════════════════

describe("ROC determination on gap finding creation", () => {
  const context = makeContext();

  it("includes roc_determination on generated gap findings", async () => {
    const deps = makeDeps();
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    // not_evidenced + medium → significant_deficiency
    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.roc_determination).toBe("significant_deficiency");
  });

  it("includes risk scores on generated gap findings", async () => {
    const deps = makeDeps();
    const service = new GapDraftService(deps);
    const item = makeSoaItem();

    const finding = await service.generateGapFindingForSoaItem(
      item, undefined, context,
    );

    expect(finding.inherent_risk_score).toBeDefined();
    expect(finding.residual_risk_score).toBeDefined();
  });
});
