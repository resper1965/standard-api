/**
 * @module workflow.repository
 * @description Drizzle PostgreSQL repositories for Workflow Runs and Audit Events.
 * Replaces in-memory workflow persistence with real PostgreSQL storage.
 */
// @ts-nocheck -- Zod v4 cross-package type resolution CI workaround
import { eq, and, notInArray } from "drizzle-orm";
import { workflowRuns, workflowAuditEvents } from "@standard/schemas";
import type { AssessmentLifecycleWorkflowState } from "@standard/schemas";
import type {
  WorkflowRepository,
  WorkflowAuditAdapter,
  WorkflowAuditEvent,
  WorkflowRunRecord,
  WorkflowDependencies,
  AssessmentEngineAdapter,
} from "@standard/workflows";
import { executeTransition } from "@standard/assessment-engine";
import type { DbClient } from "./db";

const createDrizzleWorkflowRepository = (db: DbClient): WorkflowRepository => {
  const repo: WorkflowRepository = {
    async create(input: WorkflowRunRecord) {
      await db
        .insert(workflowRuns)
        .values({
          id: input.workflow_run_id,
          organizationId: input.state.organization_id,
          assessmentId: input.state.assessment_id,
          status: input.status,
          idempotencyKey: input.idempotency_key,
          state: input.state as Record<string, unknown>,
          signalIdempotencyKeys: input.signal_idempotency_keys,
          stepIdempotencyKeys: input.step_idempotency_keys,
        })
        .onConflictDoNothing();
      return input;
    },

    async get(workflowRunId: string) {
      const [row] = await db
        .select()
        .from(workflowRuns)
        .where(eq(workflowRuns.id, workflowRunId))
        .limit(1);
      return row ? mapWorkflowRow(row) : null;
    },

    async getActiveByAssessment(assessmentId: string, organizationId: string) {
      const [row] = await db
        .select()
        .from(workflowRuns)
        .where(
          and(
            eq(workflowRuns.assessmentId, assessmentId),
            notInArray(workflowRuns.status, ["completed", "cancelled"]),
          ),
        )
        .limit(1);
      return row ? mapWorkflowRow(row) : null;
    },

    async listByAssessment(assessmentId: string, organizationId: string) {
      const rows = await db
        .select()
        .from(workflowRuns)
        .where(and(eq(workflowRuns.assessmentId, assessmentId)));
      return rows.map(mapWorkflowRow);
    },

    async save(record: WorkflowRunRecord) {
      await db
        .update(workflowRuns)
        .set({
          status: record.status,
          state: record.state as Record<string, unknown>,
          signalIdempotencyKeys: record.signal_idempotency_keys,
          stepIdempotencyKeys: record.step_idempotency_keys,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, record.workflow_run_id));
    },

    withOrganization(organizationId: string) {
      return {
        create: async (input) => repo.create(input),
        get: async (workflowRunId) => {
          const run = await repo.get(workflowRunId);
          return run && run.state.organization_id === organizationId
            ? run
            : null;
        },
        getActiveByAssessment: async (assessmentId: string) =>
          repo.getActiveByAssessment(assessmentId, organizationId),
        listByAssessment: async (assessmentId: string) =>
          repo.listByAssessment(assessmentId, organizationId),
        save: async (record) => repo.save(record),
      };
    },
  };
  return repo;
};

const createDrizzleWorkflowAuditAdapter = (
  db: DbClient,
): WorkflowAuditAdapter => ({
  async record(event: WorkflowAuditEvent) {
    await db.insert(workflowAuditEvents).values({
      organizationId: event.organization_id,
      assessmentId: event.assessment_id,
      workflowRunId: event.workflow_run_id,
      eventType: event.event_type,
      stepName: event.step_name,
      actorId: event.actor_id,
      systemActor: event.system_actor,
      traceId: event.trace_id,
      metadata: event.metadata,
    });
  },
});

const createDrizzleAssessmentEngineAdapter = (): AssessmentEngineAdapter => ({
  transitions: [],
  transition(assessment, nextState, context) {
    const result = executeTransition(assessment, nextState, context);
    this.transitions.push(nextState);
    return result;
  },
});

export const createDrizzleWorkflowDependencies = (
  db: DbClient,
): WorkflowDependencies => ({
  workflows: createDrizzleWorkflowRepository(db),
  audit: createDrizzleWorkflowAuditAdapter(db),
  assessmentEngine: createDrizzleAssessmentEngineAdapter(),
});

// --- Row mapper ---

type WorkflowRunRow = typeof workflowRuns.$inferSelect;

const mapWorkflowRow = (row: WorkflowRunRow): WorkflowRunRecord => ({
  workflow_run_id: row.id,
  status: row.status,
  idempotency_key: row.idempotencyKey,
  state: row.state as AssessmentLifecycleWorkflowState,
  signal_idempotency_keys: row.signalIdempotencyKeys,
  step_idempotency_keys: row.stepIdempotencyKeys,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});
