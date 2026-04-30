import { eq, and } from "drizzle-orm";
import { assessmentEvents } from "@aegis/schemas";
import type { AssessmentLifecycleEvent } from "@aegis/assessment-engine";
import type { LifecycleEventRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

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

export const createDrizzleLifecycleEventRepository = (db: DbClient): LifecycleEventRepositoryAdapter => {
  return {
    async record(event) {
      await db.insert(assessmentEvents).values({
        tenantId: event.tenantId,
        organizationId: event.organizationId,
        assessmentId: event.assessmentId,
        previousState: event.previousState as any,
        nextState: event.nextState as any,
        eventType: event.eventType,
        actorId: event.actorId,
        traceId: event.traceId,
        metadata: event.metadata || {},
        createdAt: new Date()
      });
    },
    async listByAssessment(assessmentId, tenantId) {
      const results = await db.select().from(assessmentEvents)
        .where(
          and(
            eq(assessmentEvents.assessmentId, assessmentId),
            eq(assessmentEvents.tenantId, tenantId)
          )
        );
        
      return results.map(found => ({
        tenantId: found.tenantId,
        organizationId: found.organizationId,
        assessmentId: found.assessmentId,
        previousState: found.previousState as any,
        nextState: found.nextState as any,
        eventType: found.eventType as any,
        actorId: found.actorId as string,
        traceId: found.traceId,
        timestamp: found.createdAt!.toISOString(),
        metadata: found.metadata as Record<string, unknown>,
        reason: ""
      }));
    }
  };
};
