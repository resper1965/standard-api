/**
 * @module assessment-lifecycle.entrypoint.test
 * @description Tests for the AssessmentLifecycleWorkflow Cloudflare entrypoint.
 * Validates:
 * 1. Input validation via exported validateWorkflowParams()
 * 2. Orchestrator instantiation via exported createWorkflowOrchestratorDeps()
 * 3. The existing orchestrator start() flow using in-memory repositories
 */
import { describe, it, expect } from "vitest";
import { AssessmentLifecycleOrchestrator } from "../assessment-lifecycle.workflow";
import {
  createInMemoryWorkflowRepository,
  createInMemoryWorkflowAuditAdapter,
  createAssessmentEngineAdapter,
} from "../repositories";
import type { AssessmentSnapshot } from "@standard/assessment-engine";

const SYNTHETIC_ORG = "00000000-0000-4000-8000-000000000001";
const SYNTHETIC_ASSESSMENT = "00000000-0000-4000-8000-000000000002";
const SYNTHETIC_ACTOR = "00000000-0000-4000-8000-000000000003";

describe("validateWorkflowParams", () => {
  it("rejects empty input", async () => {
    const { validateWorkflowParams } = await import("../assessment-lifecycle.helpers");

    expect(() => validateWorkflowParams({})).toThrow();
  });

  it("rejects input missing assessment_id", async () => {
    const { validateWorkflowParams } = await import("../assessment-lifecycle.helpers");

    expect(() =>
      validateWorkflowParams({
        organization_id: SYNTHETIC_ORG,
        requested_by: SYNTHETIC_ACTOR,
        trace_id: "trace-test-123456789",
        idempotency_key: "idem-12345678",
      }),
    ).toThrow();
  });

  it("accepts valid input with all required fields", async () => {
    const { validateWorkflowParams } = await import("../assessment-lifecycle.helpers");

    const result = validateWorkflowParams({
      organization_id: SYNTHETIC_ORG,
      assessment_id: SYNTHETIC_ASSESSMENT,
      requested_by: SYNTHETIC_ACTOR,
      trace_id: "trace-test-123456789",
      idempotency_key: "idem-12345678",
    });

    expect(result.organization_id).toBe(SYNTHETIC_ORG);
    expect(result.assessment_id).toBe(SYNTHETIC_ASSESSMENT);
  });
});

describe("createWorkflowOrchestratorDeps", () => {
  it("creates tenant-scoped in-memory dependencies for testing", async () => {
    const { createWorkflowOrchestratorDeps } = await import("../assessment-lifecycle.helpers");

    const deps = createWorkflowOrchestratorDeps(SYNTHETIC_ORG);

    expect(deps.workflows).toBeDefined();
    expect(deps.audit).toBeDefined();
    expect(deps.assessmentEngine).toBeDefined();
  });

  it("returned dependencies can create an orchestrator", async () => {
    const { createWorkflowOrchestratorDeps } = await import("../assessment-lifecycle.helpers");

    const deps = createWorkflowOrchestratorDeps(SYNTHETIC_ORG);
    const orchestrator = new AssessmentLifecycleOrchestrator(deps);

    expect(orchestrator).toBeDefined();
  });
});

describe("AssessmentLifecycleOrchestrator — start flow", () => {
  const makeAssessmentSnapshot = (
    state: string = "draft",
  ): AssessmentSnapshot => ({
    id: SYNTHETIC_ASSESSMENT,
    organizationId: SYNTHETIC_ORG,
    state: state as any,
    documentCount: 0,
    requiredDocumentJobsComplete: false,
    scfPreAnalysisRegistered: false,
    frameworkSelected: false,
    scopeDrafted: false,
    soaDraftVersionComplete: false,
    soaApproved: false,
    soaIngested: false,
    evidenceAnalysisReady: false,
    gapAnalysisDrafted: false,
    gapAnalysisApproved: false,
    maturityAssessed: false,
    maturityApproved: false,
    poamDrafted: false,
    poamApproved: false,
    reportGenerated: false,
    reportApproved: false,
  });

  it("starts a workflow and returns run response", async () => {
    const repo = createInMemoryWorkflowRepository();
    const audit = createInMemoryWorkflowAuditAdapter();
    const engine = createAssessmentEngineAdapter();

    const orchestrator = new AssessmentLifecycleOrchestrator({
      workflows: repo.withOrganization(SYNTHETIC_ORG),
      audit,
      assessmentEngine: engine,
    });

    const assessment = makeAssessmentSnapshot("draft");
    const result = await orchestrator.start(
      {
        organization_id: SYNTHETIC_ORG,
        assessment_id: SYNTHETIC_ASSESSMENT,
        requested_by: SYNTHETIC_ACTOR,
        trace_id: "trace-start-test",
        idempotency_key: "start-idem-1234",
        options: {},
      },
      assessment,
    );

    expect(result.workflow_run_id).toBeDefined();
    expect(result.status).toBeDefined();
    expect(audit.events.length).toBeGreaterThanOrEqual(1);
    expect(audit.events[0]!.event_type).toBe("lifecycle_workflow_started");
  });

  it("is idempotent — same idempotency_key returns same response", async () => {
    const repo = createInMemoryWorkflowRepository();
    const audit = createInMemoryWorkflowAuditAdapter();
    const engine = createAssessmentEngineAdapter();

    const orchestrator = new AssessmentLifecycleOrchestrator({
      workflows: repo.withOrganization(SYNTHETIC_ORG),
      audit,
      assessmentEngine: engine,
    });

    const assessment = makeAssessmentSnapshot("draft");
    const input = {
      organization_id: SYNTHETIC_ORG,
      assessment_id: SYNTHETIC_ASSESSMENT,
      requested_by: SYNTHETIC_ACTOR,
      trace_id: "trace-idem-test",
      idempotency_key: "same-idem-key-123456",
      options: {},
    };

    const first = await orchestrator.start(input, assessment);
    const second = await orchestrator.start(input, assessment);

    expect(first.workflow_run_id).toBe(second.workflow_run_id);
  });

  it("rejects duplicate active workflow with different idempotency_key", async () => {
    const repo = createInMemoryWorkflowRepository();
    const audit = createInMemoryWorkflowAuditAdapter();
    const engine = createAssessmentEngineAdapter();

    const orchestrator = new AssessmentLifecycleOrchestrator({
      workflows: repo.withOrganization(SYNTHETIC_ORG),
      audit,
      assessmentEngine: engine,
    });

    const assessment = makeAssessmentSnapshot("draft");

    await orchestrator.start(
      {
        organization_id: SYNTHETIC_ORG,
        assessment_id: SYNTHETIC_ASSESSMENT,
        requested_by: SYNTHETIC_ACTOR,
        trace_id: "trace-dup-1",
        idempotency_key: "first-idem-key-12345",
        options: {},
      },
      assessment,
    );

    await expect(
      orchestrator.start(
        {
          organization_id: SYNTHETIC_ORG,
          assessment_id: SYNTHETIC_ASSESSMENT,
          requested_by: SYNTHETIC_ACTOR,
          trace_id: "trace-dup-2",
          idempotency_key: "different-idem-key-12",
          options: {},
        },
        assessment,
      ),
    ).rejects.toThrow(/DUPLICATE_ACTIVE_WORKFLOW/);
  });

  it("rejects mismatched tenant context", async () => {
    const repo = createInMemoryWorkflowRepository();
    const audit = createInMemoryWorkflowAuditAdapter();
    const engine = createAssessmentEngineAdapter();

    const orchestrator = new AssessmentLifecycleOrchestrator({
      workflows: repo.withOrganization(SYNTHETIC_ORG),
      audit,
      assessmentEngine: engine,
    });

    const assessment = makeAssessmentSnapshot("draft");
    // Assessment has SYNTHETIC_ORG but input says different org
    const DIFFERENT_ORG = "00000000-0000-4000-8000-000000000099";

    await expect(
      orchestrator.start(
        {
          organization_id: DIFFERENT_ORG,
          assessment_id: SYNTHETIC_ASSESSMENT,
          requested_by: SYNTHETIC_ACTOR,
          trace_id: "trace-mismatch",
          idempotency_key: "mismatch-idem-12345",
          options: {},
        },
        assessment,
      ),
    ).rejects.toThrow(/ASSESSMENT_CONTEXT_MISMATCH/);
  });
});
