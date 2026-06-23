/**
 * @module assessment-lifecycle
 * @description Cloudflare Workflow entrypoint for the Assessment Lifecycle.
 *
 * Wires the AssessmentLifecycleOrchestrator to the Cloudflare Workflows runtime.
 * The orchestrator contains all lifecycle logic (832 lines); this entrypoint
 * provides the durable execution context (step.do, step.sleep, checkpoints).
 *
 * AGENTS.md §11: Workflows must control durable transitions; frontend never changes state directly.
 * AGENTS.md §6: Workflows: orquestração durável, retries, checkpoints, waits e approval gates.
 */
import type {
  AssessmentLifecycleWorkflowInput,
  AssessmentLifecycleWorkflowState,
  WorkflowRunResponse,
} from "@standard/schemas";
import type { AssessmentSnapshot } from "@standard/assessment-engine";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import {
  validateWorkflowParams,
  createWorkflowOrchestratorDeps,
} from "./assessment-lifecycle.helpers";
import { AssessmentLifecycleOrchestrator } from "./assessment-lifecycle.workflow";

// Re-export for any consumers that import from this module
export { validateWorkflowParams, createWorkflowOrchestratorDeps };

export type WorkflowCheckpoint = {
  assessment_id: string;
  state: AssessmentLifecycleWorkflowState;
};

/**
 * Cloudflare Workflow Env bindings.
 *
 * In production these come from wrangler.toml [[workflows]] config.
 * DATABASE_URL: PostgreSQL connection string (Secret)
 * STANDARD_REPORTS_BUCKET: R2 binding for report exports
 * AGENT_RUN_QUEUE: Queue binding for async agent dispatches (ADR-003)
 */
export interface Env {
  DATABASE_URL?: string;
  STANDARD_REPORTS_BUCKET?: R2Bucket;
  AGENT_RUN_QUEUE?: Queue;
  STANDARD_ENV?: string;
}

/**
 * Builds a minimal AssessmentSnapshot for workflow initialization.
 * All boolean flags default to false since the assessment starts in "draft".
 * In production, this would be replaced by a DB fetch via the assessment engine adapter.
 */
function buildInitialSnapshot(
  input: AssessmentLifecycleWorkflowInput,
): AssessmentSnapshot {
  return {
    id: input.assessment_id,
    organizationId: input.organization_id,
    state: "draft",
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
  };
}

export class AssessmentLifecycleWorkflow extends WorkflowEntrypoint<
  Env,
  unknown
> {
  async run(
    event: WorkflowEvent<unknown>,
    step: WorkflowStep,
  ): Promise<WorkflowCheckpoint> {
    // ── Step 1: Validate Input (outside step.do to preserve type) ──
    // Validation is deterministic and idempotent, so it's safe outside step.do.
    // The Zod schema throws on invalid input, which Cloudflare Workflows
    // catches as a workflow failure.
    const input: AssessmentLifecycleWorkflowInput = validateWorkflowParams(
      event.payload,
    );

    // ── Step 2: Create Dependencies ──
    const deps = createWorkflowOrchestratorDeps(input.organization_id);
    const orchestrator = new AssessmentLifecycleOrchestrator(deps);

    // ── Step 3: Start Orchestrator ──
    // The orchestrator manages the full lifecycle: validate → ingest → SCF analysis →
    // framework selection → scope/SoA → gap analysis → maturity → POA&M → report.
    // Each step within the orchestrator is idempotent and produces audit events.
    const startResult = await step.do("start-lifecycle", async () => {
      const assessment = buildInitialSnapshot(input);
      return orchestrator.start(input, assessment);
    });

    // ── Step 4: Build Checkpoint ──
    // Cast is safe: step.do serializes/deserializes, so we recover the shape.
    const result = startResult as unknown as WorkflowRunResponse;
    const checkpoint: WorkflowCheckpoint = {
      assessment_id: input.assessment_id,
      state: result.state,
    };

    // ── Step 5: Log ──
    await step.do("log-workflow-started", async () => {
      console.log(
        JSON.stringify({
          level: "info",
          message: "assessment_lifecycle_workflow_started",
          service: "workflow-worker",
          trace_id: input.trace_id,
          metadata: {
            assessment_id: input.assessment_id,
            organization_id: input.organization_id.slice(0, 3) + "***",
            workflow_run_id: result.workflow_run_id,
            status: result.status,
            current_step: result.state.current_step,
          },
        }),
      );
    });

    return checkpoint;
  }
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({
      service: "standard-assessment-lifecycle",
      status: "active",
      message:
        "Workflow Worker for durable assessment lifecycle orchestration. " +
        "Dispatched via Cloudflare Workflows API.",
    });
  },
};
