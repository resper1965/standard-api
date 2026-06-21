import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @standard/schemas to avoid broken barrel import (strmOperatorEnum)
vi.mock("@standard/schemas", () => ({
  StrmOperatorValues: ["equal", "subset", "intersects", "superset", "no_relation"],
}));

import {
  SoaWorkflowError,
  assertContext,
  assertActor,
} from "../errors";
import {
  InMemoryScopeRepository,
  InMemorySoaVersionRepository,
  InMemorySoaItemRepository,
  createInMemorySoaRepositories,
} from "../repositories/soa.repositories";
import { SoaDraftService } from "../services/soa-draft.service";
import { SoaReviewService } from "../services/soa-review.service";
import { SoaApprovalService } from "../services/soa-approval.service";
import type {
  SoaDependencies,
  SoaWorkflowContext,
  SoaVersionResponse,
  SoaItemResponse,
} from "../types";

// ─── Synthetic Test Data ────────────────────────────────────────────────────────
const ORG_ID = "a0000000-0000-0000-0000-000000000001";
const ASSESSMENT_ID = "b0000000-0000-0000-0000-000000000001";
const ACTOR_ID = "c0000000-0000-0000-0000-000000000001";
const TRACE_ID = "t0000000-0000-0000-0000-000000000001";
const FRAMEWORK_ID = "fw-iso-27001";
const SCF_VERSION_ID = "scf-2024.4";

const validContext: SoaWorkflowContext = {
  organizationId: ORG_ID,
  assessmentId: ASSESSMENT_ID,
  actorId: ACTOR_ID,
  traceId: TRACE_ID,
};

const mockScfDeps = {
  frameworks: {
    listRequirements: vi.fn().mockResolvedValue([
      { id: "req-001", code: "A.5.1", title: "Policies for information security" },
      { id: "req-002", code: "A.5.2", title: "Information security roles" },
      { id: "req-003", code: "A.6.1", title: "Screening" },
    ]),
  },
  mappings: {
    mapFrameworkToScf: vi.fn().mockResolvedValue([
      {
        id: "map-001",
        scf_framework_requirement_id: "req-001",
        scf_control_id: "SCF-GOV-01",
        relationship_type: "equal",
        is_official: true,
      },
      {
        id: "map-002",
        scf_framework_requirement_id: "req-002",
        scf_control_id: "SCF-GOV-02",
        relationship_type: "subset",
        is_official: true,
        relationship_strength: "strong",
      },
      // req-003 has no official mapping
    ]),
  },
};

function createDeps(): SoaDependencies {
  return {
    repositories: createInMemorySoaRepositories(),
    scf: mockScfDeps as any,
  };
}

// ─── Error Guards ───────────────────────────────────────────────────────────────

describe("assertContext", () => {
  it("throws when organizationId is missing", () => {
    expect(() =>
      assertContext({ assessmentId: ASSESSMENT_ID, traceId: TRACE_ID })
    ).toThrow(SoaWorkflowError);
  });

  it("throws when assessmentId is missing", () => {
    expect(() =>
      assertContext({ organizationId: ORG_ID, traceId: TRACE_ID })
    ).toThrow(SoaWorkflowError);
  });

  it("throws when traceId is missing", () => {
    expect(() =>
      assertContext({ organizationId: ORG_ID, assessmentId: ASSESSMENT_ID })
    ).toThrow(SoaWorkflowError);
  });

  it("passes with all fields present", () => {
    expect(() =>
      assertContext({ organizationId: ORG_ID, assessmentId: ASSESSMENT_ID, traceId: TRACE_ID })
    ).not.toThrow();
  });
});

describe("assertActor", () => {
  it("throws when actorId is missing", () => {
    expect(() => assertActor({})).toThrow(SoaWorkflowError);
  });

  it("passes with actorId present", () => {
    expect(() => assertActor({ actorId: ACTOR_ID })).not.toThrow();
  });
});

describe("SoaWorkflowError", () => {
  it("captures code and details", () => {
    const err = new SoaWorkflowError("TEST_CODE", "msg", { key: "val" });
    expect(err.code).toBe("TEST_CODE");
    expect(err.details).toEqual({ key: "val" });
    expect(err.name).toBe("SoaWorkflowError");
    expect(err.message).toContain("TEST_CODE");
  });
});

// ─── InMemory Repositories ──────────────────────────────────────────────────────

describe("InMemorySoaVersionRepository", () => {
  let repo: InMemorySoaVersionRepository;
  const version: SoaVersionResponse = {
    soa_version_id: "v-001",
    organization_id: ORG_ID,
    assessment_id: ASSESSMENT_ID,
    version_number: 1,
    status: "draft",
    source_framework_id: FRAMEWORK_ID,
    scf_version_id: SCF_VERSION_ID,
    created_by: ACTOR_ID,
    created_at: "2026-01-01T00:00:00Z",
    trace_id: TRACE_ID,
  } as any;

  beforeEach(() => {
    repo = new InMemorySoaVersionRepository();
  });

  it("save and get", async () => {
    await repo.save(version);
    expect(await repo.get("v-001", ORG_ID)).toEqual(version);
  });

  it("returns null for wrong org", async () => {
    await repo.save(version);
    expect(await repo.get("v-001", "other-org")).toBeNull();
  });

  it("returns null for missing id", async () => {
    expect(await repo.get("nonexistent", ORG_ID)).toBeNull();
  });

  it("update overwrites", async () => {
    await repo.save(version);
    const updated = { ...version, status: "under_review" as const };
    await repo.update(updated);
    const result = await repo.get("v-001", ORG_ID);
    expect((result as any).status).toBe("under_review");
  });

  it("listByAssessment scopes by org and assessment", async () => {
    await repo.save(version);
    const other = { ...version, soa_version_id: "v-other", organization_id: "other-org" } as any;
    await repo.save(other);
    const result = await repo.listByAssessment(ASSESSMENT_ID, ORG_ID);
    expect(result).toHaveLength(1);
    expect((result[0] as any).soa_version_id).toBe("v-001");
  });
});

describe("InMemorySoaItemRepository", () => {
  let repo: InMemorySoaItemRepository;

  beforeEach(() => {
    repo = new InMemorySoaItemRepository();
  });

  it("saveMany and listByVersion", async () => {
    const items = [
      { soa_item_id: "i-1", soa_version_id: "v-1", organization_id: ORG_ID },
      { soa_item_id: "i-2", soa_version_id: "v-1", organization_id: ORG_ID },
    ] as any[];
    await repo.saveMany(items);
    const result = await repo.listByVersion("v-1", ORG_ID);
    expect(result).toHaveLength(2);
  });

  it("scopes by organization_id", async () => {
    await repo.saveMany([
      { soa_item_id: "i-1", soa_version_id: "v-1", organization_id: ORG_ID },
      { soa_item_id: "i-2", soa_version_id: "v-1", organization_id: "other-org" },
    ] as any[]);
    expect(await repo.listByVersion("v-1", ORG_ID)).toHaveLength(1);
  });
});

// ─── SoaDraftService ────────────────────────────────────────────────────────────

describe("SoaDraftService", () => {
  let deps: SoaDependencies;
  let service: SoaDraftService;

  beforeEach(() => {
    deps = createDeps();
    service = new SoaDraftService(deps);
    vi.clearAllMocks();
  });

  it("creates draft from framework with correct metadata", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID,
      FRAMEWORK_ID,
      SCF_VERSION_ID,
      validContext,
    );
    expect(version.status).toBe("draft");
    expect(version.organization_id).toBe(ORG_ID);
    expect(version.assessment_id).toBe(ASSESSMENT_ID);
    expect(version.source_framework_id).toBe(FRAMEWORK_ID);
    expect(version.version_number).toBe(1);
    expect(version.created_by).toBe(ACTOR_ID);
    expect(version.trace_id).toBe(TRACE_ID);
  });

  it("creates items for each requirement/mapping combination", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID,
      FRAMEWORK_ID,
      SCF_VERSION_ID,
      validContext,
    );
    const items = await deps.repositories.items.listByVersion(
      version.soa_version_id,
      ORG_ID,
    );
    // req-001: 1 official mapping, req-002: 1 official mapping, req-003: no mapping = 3 items
    expect(items).toHaveLength(3);
  });

  it("marks items with no mapping as no_official_mapping", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID,
      FRAMEWORK_ID,
      SCF_VERSION_ID,
      validContext,
    );
    const items = await deps.repositories.items.listByVersion(
      version.soa_version_id,
      ORG_ID,
    );
    const unmapped = items.find((i: any) => i.mapping_status === "no_official_mapping");
    expect(unmapped).toBeDefined();
    expect((unmapped as any).validation_notes).toContain("No official SCF mapping");
  });

  it("sets official_mapping items with SCF control and relationship_type", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID,
      FRAMEWORK_ID,
      SCF_VERSION_ID,
      validContext,
    );
    const items = await deps.repositories.items.listByVersion(
      version.soa_version_id,
      ORG_ID,
    );
    const mapped = items.filter((i: any) => i.mapping_status === "official_mapping");
    expect(mapped).toHaveLength(2);
    expect((mapped[0] as any).scf_control_id).toBeDefined();
    expect((mapped[0] as any).relationship_type).toBeDefined();
  });

  it("increments version_number on subsequent drafts", async () => {
    await service.createDraftFromFramework(ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext);
    const v2 = await service.createDraftFromFramework(ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext);
    expect(v2.version_number).toBe(2);
  });

  it("throws TENANT_CONTEXT_MISMATCH on wrong assessmentId", async () => {
    await expect(
      service.createDraftFromFramework(
        "wrong-assessment-id",
        FRAMEWORK_ID,
        SCF_VERSION_ID,
        validContext,
      ),
    ).rejects.toThrow("TENANT_CONTEXT_MISMATCH");
  });

  it("throws without actor", async () => {
    const noActor = { ...validContext, actorId: undefined };
    await expect(
      service.createDraftFromFramework(ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, noActor),
    ).rejects.toThrow(SoaWorkflowError);
  });

  it("getSoaVersion returns correct version", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const found = await service.getSoaVersion(version.soa_version_id, validContext);
    expect(found.soa_version_id).toBe(version.soa_version_id);
  });

  it("getSoaVersion throws for wrong org", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const otherCtx = { ...validContext, organizationId: "other-org" };
    await expect(
      service.getSoaVersion(version.soa_version_id, otherCtx),
    ).rejects.toThrow("SOA_VERSION_NOT_FOUND");
  });

  it("listSoaItems filters by applicability_status", async () => {
    const version = await service.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const all = await service.listSoaItems(version.soa_version_id, {}, validContext);
    expect(all.length).toBeGreaterThan(0);
    // All new items start as requires_validation
    const filtered = await service.listSoaItems(
      version.soa_version_id,
      { applicability_status: "applicable" },
      validContext,
    );
    expect(filtered).toHaveLength(0); // none are "applicable" yet
  });
});

// ─── SoaReviewService ───────────────────────────────────────────────────────────

describe("SoaReviewService", () => {
  let deps: SoaDependencies;
  let draftService: SoaDraftService;
  let reviewService: SoaReviewService;

  beforeEach(async () => {
    deps = createDeps();
    draftService = new SoaDraftService(deps);
    reviewService = new SoaReviewService(deps);
    vi.clearAllMocks();
  });

  it("validateSoaForReview returns blocking errors for to_be_defined items", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    // Default items have applicability_status: "requires_validation" which won't block
    // but let's manually add a to_be_defined item
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    if (items[0]) {
      await deps.repositories.items.update({
        ...items[0],
        applicability_status: "to_be_defined",
      } as any);
    }
    const validation = await reviewService.validateSoaForReview(version.soa_version_id, validContext);
    expect(validation.valid).toBe(false);
    expect(validation.blocking_errors.length).toBeGreaterThan(0);
  });

  it("updateSoaItemDecision updates item fields", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    const item = items[0]!;
    const updated = await reviewService.updateSoaItemDecision(
      (item as any).soa_item_id,
      { applicability_status: "applicable" } as any,
      validContext,
    );
    expect((updated as any).applicability_status).toBe("applicable");
  });

  it("blocks update on approved version (immutability)", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    // Manually set version to approved
    await deps.repositories.versions.update({ ...version, status: "approved" } as any);
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    await expect(
      reviewService.updateSoaItemDecision(
        (items[0] as any).soa_item_id,
        { applicability_status: "applicable" } as any,
        validContext,
      ),
    ).rejects.toThrow("SOA_VERSION_IMMUTABLE");
  });

  it("requires non_applicability_rationale for not_applicable", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    await expect(
      reviewService.updateSoaItemDecision(
        (items[0] as any).soa_item_id,
        { applicability_status: "not_applicable" } as any,
        validContext,
      ),
    ).rejects.toThrow("NON_APPLICABILITY_RATIONALE_REQUIRED");
  });

  it("requires scope_rationale for out_of_scope", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    await expect(
      reviewService.updateSoaItemDecision(
        (items[0] as any).soa_item_id,
        { applicability_status: "out_of_scope" } as any,
        validContext,
      ),
    ).rejects.toThrow("SCOPE_RATIONALE_REQUIRED");
  });

  it("submitSoaForReview transitions status to under_review", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    // Mark all items as applicable so validation passes
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    for (const item of items) {
      await deps.repositories.items.update({
        ...item,
        applicability_status: "applicable",
      } as any);
    }
    const submitted = await reviewService.submitSoaForReview(
      version.soa_version_id,
      validContext,
    );
    expect(submitted.status).toBe("under_review");
  });

  it("submitSoaForReview blocks when validation fails without rationale", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    // Set item to to_be_defined
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    await deps.repositories.items.update({
      ...items[0]!,
      applicability_status: "to_be_defined",
    } as any);
    await expect(
      reviewService.submitSoaForReview(version.soa_version_id, validContext),
    ).rejects.toThrow("SOA_REVIEW_BLOCKED");
  });

  it("submitSoaForReview allows to_be_defined with exceptionRationale", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    await deps.repositories.items.update({
      ...items[0]!,
      applicability_status: "to_be_defined",
    } as any);
    // Mark the rest as applicable
    for (let i = 1; i < items.length; i++) {
      await deps.repositories.items.update({
        ...items[i]!,
        applicability_status: "applicable",
      } as any);
    }
    const submitted = await reviewService.submitSoaForReview(
      version.soa_version_id,
      validContext,
      "Accepted risk per compliance officer",
    );
    expect(submitted.status).toBe("under_review");
    expect((submitted as any).metadata.exception_rationale).toContain("Accepted risk");
  });
});

// ─── SoaApprovalService ─────────────────────────────────────────────────────────

describe("SoaApprovalService", () => {
  let deps: SoaDependencies;
  let draftService: SoaDraftService;
  let reviewService: SoaReviewService;
  let approvalService: SoaApprovalService;

  beforeEach(async () => {
    deps = createDeps();
    draftService = new SoaDraftService(deps);
    reviewService = new SoaReviewService(deps);
    approvalService = new SoaApprovalService(deps);
    vi.clearAllMocks();
  });

  async function createApprovedPrerequisite(): Promise<SoaVersionResponse> {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const items = await deps.repositories.items.listByVersion(version.soa_version_id, ORG_ID);
    for (const item of items) {
      await deps.repositories.items.update({
        ...item,
        applicability_status: "applicable",
      } as any);
    }
    await reviewService.submitSoaForReview(version.soa_version_id, validContext);
    return version;
  }

  it("approves under_review version with approval_event_id", async () => {
    const version = await createApprovedPrerequisite();
    const approved = await approvalService.approveSoa(
      version.soa_version_id,
      { approval_event_id: "approval-001" },
      validContext,
    );
    expect(approved.status).toBe("approved");
    expect((approved as any).approved_by).toBe(ACTOR_ID);
    expect((approved as any).approval_event_id).toBe("approval-001");
  });

  it("throws without approval_event_id (human approval gate)", async () => {
    const version = await createApprovedPrerequisite();
    await expect(
      approvalService.approveSoa(version.soa_version_id, {}, validContext),
    ).rejects.toThrow("APPROVAL_EVENT_REQUIRED");
  });

  it("blocks approval on draft status", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    await expect(
      approvalService.approveSoa(
        version.soa_version_id,
        { approval_event_id: "approval-001" },
        validContext,
      ),
    ).rejects.toThrow("SOA_APPROVAL_BLOCKED");
  });

  it("supersedes previous approved versions", async () => {
    // Create and approve v1
    const v1 = await createApprovedPrerequisite();
    await approvalService.approveSoa(
      v1.soa_version_id,
      { approval_event_id: "approval-v1" },
      validContext,
    );

    // Create and approve v2
    const v2 = await createApprovedPrerequisite();
    await approvalService.approveSoa(
      v2.soa_version_id,
      { approval_event_id: "approval-v2" },
      validContext,
    );

    // v1 should now be superseded
    const v1After = await deps.repositories.versions.get(v1.soa_version_id, ORG_ID);
    expect((v1After as any).status).toBe("superseded");
    expect((v1After as any).superseded_by).toBe(v2.soa_version_id);
  });

  it("marks ingestion required after approval", async () => {
    const version = await createApprovedPrerequisite();
    const approved = await approvalService.approveSoa(
      version.soa_version_id,
      { approval_event_id: "approval-001" },
      validContext,
    );
    expect((approved as any).metadata.soa_ingestion_status).toBe("required");
  });

  it("markSoaIngested updates ingestion status", async () => {
    const version = await createApprovedPrerequisite();
    await approvalService.approveSoa(
      version.soa_version_id,
      { approval_event_id: "approval-001" },
      validContext,
    );
    const ingested = await approvalService.markSoaIngested(
      version.soa_version_id,
      validContext,
    );
    expect((ingested as any).metadata.soa_ingestion_status).toBe("ingested");
  });
});

// ─── Tenant Isolation ───────────────────────────────────────────────────────────

describe("Tenant Isolation", () => {
  let deps: SoaDependencies;
  let draftService: SoaDraftService;

  beforeEach(() => {
    deps = createDeps();
    draftService = new SoaDraftService(deps);
    vi.clearAllMocks();
  });

  it("cannot access version from another organization", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const otherOrgCtx = {
      ...validContext,
      organizationId: "other-org-id",
    };
    await expect(
      draftService.getSoaVersion(version.soa_version_id, otherOrgCtx),
    ).rejects.toThrow("SOA_VERSION_NOT_FOUND");
  });

  it("cannot access version from another assessment", async () => {
    const version = await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const otherAssessCtx = {
      ...validContext,
      assessmentId: "other-assessment-id",
    };
    await expect(
      draftService.getSoaVersion(version.soa_version_id, otherAssessCtx),
    ).rejects.toThrow("SOA_VERSION_NOT_FOUND");
  });

  it("listSoaVersions only returns versions for current org+assessment", async () => {
    await draftService.createDraftFromFramework(
      ASSESSMENT_ID, FRAMEWORK_ID, SCF_VERSION_ID, validContext,
    );
    const result = await draftService.listSoaVersions(ASSESSMENT_ID, validContext);
    expect(result).toHaveLength(1);
    const otherResult = await draftService.listSoaVersions(
      ASSESSMENT_ID,
      { ...validContext, organizationId: "other-org" },
    );
    expect(otherResult).toHaveLength(0);
  });
});
