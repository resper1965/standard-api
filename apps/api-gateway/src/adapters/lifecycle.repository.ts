import type { AssessmentLifecycleEvent } from "@aegis/assessment-engine";
import type { LifecycleEventRepositoryAdapter } from "../http";

export const createLifecycleEventRepository = (): LifecycleEventRepositoryAdapter => {
  const records: AssessmentLifecycleEvent[] = [];

  return {
    async record(event) {
      records.push(event);
    },
    async listByAssessment(assessmentId, tenantId) {
      return records.filter((record) => record.assessmentId === assessmentId && record.tenantId === tenantId);
    }
  };
};
