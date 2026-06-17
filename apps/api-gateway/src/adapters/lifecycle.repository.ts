import { eq, and } from "drizzle-orm";
import { assessmentEvents } from "@standard/schemas";
import type { AssessmentLifecycleEvent } from "@standard/assessment-engine";
import type { LifecycleEventRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

// â”€â”€â”€ Row Mapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type EventRow = typeof assessmentEvents.$inferSelect;

const mapRowToEvent = (row: EventRow): AssessmentLifecycleEvent => ({
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  previousState: row.previousState as AssessmentLifecycleEvent["previousState"],
  nextState: row.nextState as AssessmentLifecycleEvent["nextState"],
  eventType: row.eventType as AssessmentLifecycleEvent["eventType"],
  actorId: row.actorId as string,
  traceId: row.traceId,
  timestamp: row.createdAt!.toISOString(),
  metadata: row.metadata as Record<string, unknown>,
  reason: "",
});

// â”€â”€â”€ In-Memory (dev/test fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createLifecycleEventRepository =
  (): LifecycleEventRepositoryAdapter => {
    const records: AssessmentLifecycleEvent[] = [];

    return {
      async record(event) {
        records.push(event);
      },
      async listByAssessment(assessmentId, organizationId) {
        return records.filter(
          (record) =>
            record.assessmentId === assessmentId &&
            record.organizationId === organizationId,
        );
      },
      withOrganization(organizationId: string) {
        return {
          record: async (event) => this.record(event),
          listByAssessment: async (assessmentId: string) =>
            this.listByAssessment(assessmentId, organizationId),
        };
      },
    };
  };

// â”€â”€â”€ Drizzle (production) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createDrizzleLifecycleEventRepository = (
  db: DbClient,
): LifecycleEventRepositoryAdapter => {
  return {
    async record(event) {
      await db.insert(assessmentEvents).values({
        organizationId: event.organizationId,
        assessmentId: event.assessmentId,
        previousState: event.previousState as EventRow["previousState"],
        nextState: event.nextState as EventRow["nextState"],
        eventType: event.eventType,
        actorId: event.actorId,
        traceId: event.traceId,
        metadata: event.metadata || {},
        createdAt: new Date(),
      });
    },
    async listByAssessment(assessmentId, organizationId) {
      const results = await db
        .select()
        .from(assessmentEvents)
        .where(and(eq(assessmentEvents.assessmentId, assessmentId)));
      return results.map(mapRowToEvent);
    },
    withOrganization(organizationId: string) {
      return {
        record: async (event) => this.record(event),
        listByAssessment: async (assessmentId: string) =>
          this.listByAssessment(assessmentId, organizationId),
      };
    },
  };
};

