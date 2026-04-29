import { executeTransition } from "@aegis/assessment-engine";
import type { AssessmentEngineAdapter, WorkflowAuditAdapter, WorkflowAuditEvent, WorkflowDependencies, WorkflowRepository, WorkflowRunRecord } from "./types";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createInMemoryWorkflowRepository = (): WorkflowRepository => {
  const records = new Map<string, WorkflowRunRecord>();

  return {
    async create(input) {
      records.set(input.workflow_run_id, clone(input));
      return clone(input);
    },
    async get(workflowRunId) {
      const record = records.get(workflowRunId);
      return record ? clone(record) : null;
    },
    async getActiveByAssessment(assessmentId, tenantId) {
      const active = [...records.values()].find((record) =>
        record.state.assessment_id === assessmentId &&
        record.state.tenant_id === tenantId &&
        !["completed", "cancelled"].includes(record.status)
      );
      return active ? clone(active) : null;
    },
    async listByAssessment(assessmentId, tenantId) {
      return [...records.values()]
        .filter((record) => record.state.assessment_id === assessmentId && record.state.tenant_id === tenantId)
        .map(clone);
    },
    async save(record) {
      records.set(record.workflow_run_id, clone(record));
    }
  };
};

export const createInMemoryWorkflowAuditAdapter = () => {
  const events: WorkflowAuditEvent[] = [];
  const adapter: WorkflowAuditAdapter & { events: WorkflowAuditEvent[] } = {
    events,
    async record(event) {
      events.push(clone(event));
    }
  };
  return adapter;
};

export const createAssessmentEngineAdapter = (): AssessmentEngineAdapter => ({
  transitions: [],
  transition(assessment, nextState, context) {
    const result = executeTransition(assessment, nextState, context);
    this.transitions.push(nextState);
    return result;
  }
});

export const createInMemoryWorkflowDependencies = (): WorkflowDependencies & {
  audit: ReturnType<typeof createInMemoryWorkflowAuditAdapter>;
  assessmentEngine: AssessmentEngineAdapter;
} => ({
  workflows: createInMemoryWorkflowRepository(),
  audit: createInMemoryWorkflowAuditAdapter(),
  assessmentEngine: createAssessmentEngineAdapter()
});
