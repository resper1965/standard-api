import type { PgDatabase } from "drizzle-orm/pg-core";
import { assessmentControlEvents } from "@standard/schemas";

export type LedgerEventParams = {
  organizationId: string;
  assessmentId: string;
  scfControlId: string;
  scfVersionId: string;
  eventType:
    | "status_changed"
    | "evidence_added"
    | "finding_created"
    | "finding_updated"
    | "approval_gate"
    | "mutation_blocked"
    | "third_party_inherited";
  previousValue?: Record<string, unknown>;
  newValue: Record<string, unknown>;
  actorId?: string;
  traceId: string;
};

export class LedgerService {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  async appendEvent(params: LedgerEventParams): Promise<void> {
    await this.db.insert(assessmentControlEvents).values({
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      scfControlId: params.scfControlId,
      scfVersionId: params.scfVersionId,
      eventType: params.eventType,
      previousValue: params.previousValue,
      newValue: params.newValue,
      actorId: params.actorId || "system",
      traceId: params.traceId,
    });
  }
}
