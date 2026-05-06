import { eq, and } from "drizzle-orm";
import { approvalEvents } from "@standard/schemas";
import type { ApprovalEvent, ApprovalGate } from "@standard/assessment-engine";
import type { ApprovalRecord, ApprovalRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

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
        gate: approval.gate as any,
        decision: approval.decision as any,
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

export const createDrizzleApprovalRepository = (db: DbClient): ApprovalRepositoryAdapter => {
  return {
    async create(input) {
      const record = {
        id: input.id,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        assessmentId: input.assessmentId,
        gate: input.gate as any,
        decision: input.decision as any,
        artifactType: input.targetType as any,
        artifactId: input.targetId,
        reviewerUserId: input.approvedBy,
        comment: input.reason,
        traceId: input.traceId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(approvalEvents).values(record);
      return input;
    },
    async get(approvalId) {
      const [found] = await db.select().from(approvalEvents).where(eq(approvalEvents.id, approvalId)).limit(1);
      if (!found) return null;
      
      return {
        id: found.id,
        gate: found.gate as any,
        decision: found.decision as any,
        approvedBy: found.reviewerUserId,
        approvedAt: found.createdAt!.toISOString(),
        traceId: found.traceId,
        tenantId: found.tenantId,
        organizationId: found.organizationId,
        assessmentId: found.assessmentId,
        targetType: found.artifactType as any,
        targetId: found.artifactId,
        reason: found.comment || ""
      };
    },
    async getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null> {
      const [found] = await db.select().from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.id, approvalId),
            eq(approvalEvents.gate, gate as any),
            eq(approvalEvents.decision, "approved" as any)
          )
        )
        .limit(1);
        
      if (!found) return null;

      return {
        id: found.id,
        gate: found.gate as any,
        decision: found.decision as any,
        approvedBy: found.reviewerUserId,
        approvedAt: found.createdAt!.toISOString(),
        traceId: found.traceId
      };
    },
    async listByAssessment(assessmentId, tenantId) {
      const results = await db.select().from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.assessmentId, assessmentId),
            eq(approvalEvents.tenantId, tenantId)
          )
        );
        
      return results.map(found => ({
        id: found.id,
        gate: found.gate as any,
        decision: found.decision as any,
        approvedBy: found.reviewerUserId,
        approvedAt: found.createdAt!.toISOString(),
        traceId: found.traceId,
        tenantId: found.tenantId,
        organizationId: found.organizationId,
        assessmentId: found.assessmentId,
        targetType: found.artifactType as any,
        targetId: found.artifactId,
        reason: found.comment || ""
      }));
    }
  };
};

