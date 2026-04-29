import type { ApprovalEvent, ApprovalGate } from "@aegis/assessment-engine";
import type { ApprovalRecord, ApprovalRepositoryAdapter } from "../http";

export const createApprovalRepository = (): ApprovalRepositoryAdapter => {
  const records = new Map<string, ApprovalRecord>();

  return {
    async create(input) {
      records.set(input.id, input);
      return input;
    },
    async get(approvalId) {
      return records.get(approvalId) ?? null;
    },
    async getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null> {
      const approval = records.get(approvalId);
      if (!approval || approval.gate !== gate || approval.decision !== "approved") {
        return null;
      }

      return {
        id: approval.id,
        gate: approval.gate,
        decision: approval.decision,
        approvedBy: approval.approvedBy,
        approvedAt: approval.approvedAt,
        traceId: approval.traceId
      };
    },
    async listByAssessment(assessmentId, tenantId) {
      return [...records.values()].filter(
        (record) => record.assessmentId === assessmentId && record.tenantId === tenantId
      );
    }
  };
};
