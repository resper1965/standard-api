import { eq, and } from "drizzle-orm";
import { approvalEvents } from "@standard/schemas";
import type { ApprovalEvent, ApprovalGate } from "@standard/assessment-engine";
import type { ApprovalRecord, ApprovalRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

// ─── Row Mapper ─────────────────────────────────────────────────────
// Single point of translation between Drizzle row types and domain types.
// The pgEnum column types align with domain enums at runtime, but TS
// sees them as different nominal types. This mapper handles the cast once.

type ApprovalRow = typeof approvalEvents.$inferSelect;

const mapRowToRecord = (row: ApprovalRow): ApprovalRecord => ({
  id: row.id,
  gate: row.gate as ApprovalRecord["gate"],
  decision: row.decision as ApprovalRecord["decision"],
  approvedBy: row.reviewerUserId,
  approvedAt: row.createdAt!.toISOString(),
  traceId: row.traceId,
  tenantId: row.tenantId,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  targetType: row.artifactType as ApprovalRecord["targetType"],
  targetId: row.artifactId,
  reason: row.comment || "",
});

const mapRowToEvent = (row: ApprovalRow): ApprovalEvent => ({
  id: row.id,
  gate: row.gate as ApprovalEvent["gate"],
  decision: row.decision as ApprovalEvent["decision"],
  approvedBy: row.reviewerUserId,
  approvedAt: row.createdAt!.toISOString(),
  traceId: row.traceId,
});

// ─── In-Memory (dev/test fallback) ─────────────────────────────────

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
        gate: approval.gate as ApprovalEvent["gate"],
        decision: approval.decision as ApprovalEvent["decision"],
        approvedBy: approval.approvedBy,
        approvedAt: approval.approvedAt,
        traceId: approval.traceId,
      };
    },
    async listByAssessment(assessmentId, tenantId) {
      return [...records.values()].filter(
        (record) => record.assessmentId === assessmentId && record.tenantId === tenantId
      );
    },
  };
};

// ─── Drizzle (production) ──────────────────────────────────────────

export const createDrizzleApprovalRepository = (db: DbClient): ApprovalRepositoryAdapter => {
  return {
    async create(input) {
      await db.insert(approvalEvents).values({
        id: input.id,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        assessmentId: input.assessmentId,
        gate: input.gate as ApprovalRow["gate"],
        decision: input.decision as ApprovalRow["decision"],
        artifactType: input.targetType,
        artifactId: input.targetId,
        reviewerUserId: input.approvedBy,
        comment: input.reason,
        traceId: input.traceId,
        createdAt: new Date(),
      });
      return input;
    },
    async get(approvalId) {
      const [found] = await db.select().from(approvalEvents).where(eq(approvalEvents.id, approvalId)).limit(1);
      if (!found) return null;
      return mapRowToRecord(found);
    },
    async getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null> {
      const [found] = await db.select().from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.id, approvalId),
            eq(approvalEvents.gate, gate as ApprovalRow["gate"]),
            eq(approvalEvents.decision, "approved" as ApprovalRow["decision"])
          )
        )
        .limit(1);

      if (!found) return null;
      return mapRowToEvent(found);
    },
    async listByAssessment(assessmentId, tenantId) {
      const results = await db.select().from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.assessmentId, assessmentId),
            eq(approvalEvents.tenantId, tenantId)
          )
        );
      return results.map(mapRowToRecord);
    },
  };
};
