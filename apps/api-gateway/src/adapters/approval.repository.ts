import { eq, and } from "drizzle-orm";
import { approvalEvents } from "@standard/schemas";
import type { ApprovalEvent, ApprovalGate } from "@standard/assessment-engine";
import type { ApprovalRecord, ApprovalRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

// â”€â”€â”€ Row Mapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ In-Memory (dev/test fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    async getForGate(
      approvalId: string,
      gate: ApprovalGate,
    ): Promise<ApprovalEvent | null> {
      const approval = records.get(approvalId);
      if (
        !approval ||
        approval.gate !== gate ||
        approval.decision !== "approved"
      ) {
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
    async listByAssessment(assessmentId, organizationId) {
      return [...records.values()].filter(
        (record) =>
          record.assessmentId === assessmentId &&
          record.organizationId === organizationId,
      );
    },
    async listPending(organizationId, gate?) {
      return [...records.values()].filter(
        (record) =>
          record.organizationId === organizationId &&
          (record.decision === null || record.decision === undefined) &&
          (gate === undefined || record.gate === gate),
      );
    },
    withOrganization(organizationId: string) {
      return {
        create: async (input) => this.create({ ...input, organizationId }),
        get: async (approvalId) => {
          const approval = await this.get(approvalId);
          return approval && approval.organizationId === organizationId
            ? approval
            : null;
        },
        getForGate: async (approvalId, gate) => {
          const approval = await this.getForGate(approvalId, gate);
          if (!approval) return null;
          const fullRecord = records.get(approvalId);
          return fullRecord && fullRecord.organizationId === organizationId
            ? approval
            : null;
        },
        listByAssessment: async (assessmentId) =>
          this.listByAssessment(assessmentId, organizationId),
        listPending: async (gate?) => this.listPending(organizationId, gate),
      };
    },
  };
};

// â”€â”€â”€ Drizzle (production) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createDrizzleApprovalRepository = (
  db: DbClient,
): ApprovalRepositoryAdapter => {
  return {
    async create(input) {
      await db.insert(approvalEvents).values({
        id: input.id,
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
      const [found] = await db
        .select()
        .from(approvalEvents)
        .where(eq(approvalEvents.id, approvalId))
        .limit(1);
      if (!found) return null;
      return mapRowToRecord(found);
    },
    async getForGate(
      approvalId: string,
      gate: ApprovalGate,
    ): Promise<ApprovalEvent | null> {
      const [found] = await db
        .select()
        .from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.id, approvalId),
            eq(approvalEvents.gate, gate as ApprovalRow["gate"]),
            eq(approvalEvents.decision, "approved" as ApprovalRow["decision"]),
          ),
        )
        .limit(1);

      if (!found) return null;
      return mapRowToEvent(found);
    },
    async listByAssessment(assessmentId, organizationId) {
      const results = await db
        .select()
        .from(approvalEvents)
        .where(
          and(
            eq(approvalEvents.assessmentId, assessmentId),
            eq(approvalEvents.organizationId, organizationId),
          ),
        );
      return results.map(mapRowToRecord);
    },
    async listPending(organizationId, gate?) {
      // Select approvals where decision IS NULL (pending) for this organization
      const conditions = gate
        ? and(
            eq(approvalEvents.organizationId, organizationId),
            eq(approvalEvents.gate, gate as ApprovalRow["gate"]),
          )
        : eq(approvalEvents.organizationId, organizationId);

      const results = await db.select().from(approvalEvents).where(conditions);

      // Filter server-side for null decision (pending) â€” avoids isNull import complexity
      return results.filter((r) => r.decision === null).map(mapRowToRecord);
    },
    withOrganization(organizationId: string) {
      return {
        create: async (input) => this.create({ ...input, organizationId }),
        get: async (approvalId) => {
          const [found] = await db
            .select()
            .from(approvalEvents)
            .where(
              and(
                eq(approvalEvents.id, approvalId),
                eq(approvalEvents.organizationId, organizationId),
              ),
            )
            .limit(1);
          return found ? mapRowToRecord(found) : null;
        },
        getForGate: async (approvalId, gate) => {
          const [found] = await db
            .select()
            .from(approvalEvents)
            .where(
              and(
                eq(approvalEvents.id, approvalId),
                eq(approvalEvents.gate, gate as ApprovalRow["gate"]),
                eq(
                  approvalEvents.decision,
                  "approved" as ApprovalRow["decision"],
                ),
                eq(approvalEvents.organizationId, organizationId),
              ),
            )
            .limit(1);
          return found ? mapRowToEvent(found) : null;
        },
        listByAssessment: async (assessmentId: string) =>
          this.listByAssessment(assessmentId, organizationId),
        listPending: async (gate?) => this.listPending(organizationId, gate),
      };
    },
  };
};
