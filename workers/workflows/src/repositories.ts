import { executeTransition } from "@standard/assessment-engine";
import type {
  AssessmentEngineAdapter,
  WorkflowAuditAdapter,
  WorkflowAuditEvent,
  WorkflowDependencies,
  WorkflowRepository,
  WorkflowRunRecord,
} from "./types";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createInMemoryWorkflowRepository = (): WorkflowRepository => {
  const records = new Map<string, WorkflowRunRecord>();

  const repo: WorkflowRepository = {
    async create(input) {
      records.set(input.workflow_run_id as string, clone(input));
      return clone(input);
    },
    async get(workflowRunId) {
      const record = records.get(workflowRunId);
      return record ? clone(record) : null;
    },
    async getActiveByAssessment(assessmentId, organizationId) {
      const active = [...records.values()].find(
        (record) =>
          record.state.assessment_id === assessmentId &&
          record.state.organization_id === organizationId &&
          !["completed", "cancelled"].includes(record.status),
      );
      return active ? clone(active) : null;
    },
    async listByAssessment(assessmentId, organizationId) {
      return [...records.values()]
        .filter(
          (record) =>
            record.state.assessment_id === assessmentId &&
            record.state.organization_id === organizationId,
        )
        .map(clone);
    },
    async save(record) {
      records.set(record.workflow_run_id as string, clone(record));
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

export const createInMemoryWorkflowAuditAdapter = () => {
  const events: WorkflowAuditEvent[] = [];
  const adapter: WorkflowAuditAdapter & { events: WorkflowAuditEvent[] } = {
    events,
    async record(event) {
      events.push(clone(event));
    },
  };
  return adapter;
};

export const createAssessmentEngineAdapter = (): AssessmentEngineAdapter => ({
  transitions: [],
  transition(assessment, nextState, context) {
    const result = executeTransition(assessment, nextState, context);
    this.transitions.push(nextState);
    return result;
  },
});

export const createInMemoryWorkflowDependencies = (): WorkflowDependencies & {
  audit: ReturnType<typeof createInMemoryWorkflowAuditAdapter>;
  assessmentEngine: AssessmentEngineAdapter;
} => ({
  workflows: createInMemoryWorkflowRepository(),
  audit: createInMemoryWorkflowAuditAdapter(),
  assessmentEngine: createAssessmentEngineAdapter(),
});
