/**
 * LedgerService — Assessment Control Events (ADR-002)
 *
 * ⛔ APPEND-ONLY: NUNCA fazer UPDATE ou DELETE nesta tabela.
 * ⛔ Estado actual = reducer sobre todos os eventos para (assessment_id, scf_control_id).
 *
 * Tipos de eventos suportados:
 *   status_changed    — mudança de implementation_status no SoA
 *   evidence_added    — evidência associada a um controlo
 *   finding_created   — achado de gap analysis associado
 *   approval_gate     — gate de aprovação humana registado
 *   mutation_blocked  — tentativa de escrita directa bloqueada
 *
 * Ref: docs/decisions/ADR-002-ledger-append-only.md
 */

import { eq, and, desc } from "drizzle-orm";
import { assessmentControlEvents } from "@standard/schemas";
import type { DbClient } from "./db";

// ── Types ──────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | "status_changed"
  | "evidence_added"
  | "finding_created"
  | "approval_gate"
  | "mutation_blocked";

export interface LedgerEventInput {
  organizationId: string;
  assessmentId: string;
  scfControlId: string;
  scfVersionId: string;
  eventType: LedgerEventType;
  previousValue?: Record<string, unknown>;
  newValue: Record<string, unknown>;
  actorId?: string | null;
  agentRunId?: string | null;
  traceId: string;
}

export interface LedgerEventRecord extends LedgerEventInput {
  id: string;
  occurredAt: Date;
}

export interface LedgerServiceAdapter {
  /** Append a new event — only allowed operation on this table */
  append(event: LedgerEventInput): Promise<LedgerEventRecord>;
  /** Retrieve full event history for a control within an assessment */
  listByControl(
    assessmentId: string,
    scfControlId: string,
    organizationId: string,
  ): Promise<LedgerEventRecord[]>;
  /** Retrieve full event history for an assessment */
  listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<LedgerEventRecord[]>;
}

// ── Row Mapper ─────────────────────────────────────────────────────────────

type LedgerRow = typeof assessmentControlEvents.$inferSelect;

const mapRowToRecord = (row: LedgerRow): LedgerEventRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  scfControlId: row.scfControlId,
  scfVersionId: row.scfVersionId,
  eventType: row.eventType as LedgerEventType,
  previousValue: (row.previousValue as Record<string, unknown>) ?? undefined,
  newValue: row.newValue as Record<string, unknown>,
  actorId: row.actorId ?? null,
  agentRunId: row.agentRunId ?? null,
  traceId: row.traceId,
  occurredAt: row.occurredAt,
});

// ── In-Memory (dev/test fallback) ──────────────────────────────────────────

export const createLedgerService = (): LedgerServiceAdapter => {
  const records: LedgerEventRecord[] = [];

  return {
    async append(event) {
      const record: LedgerEventRecord = {
        ...event,
        id: crypto.randomUUID(),
        occurredAt: new Date(),
      };
      records.push(record);
      return record;
    },
    async listByControl(assessmentId, scfControlId, organizationId) {
      return records.filter(
        (r) =>
          r.assessmentId === assessmentId &&
          r.scfControlId === scfControlId &&
          r.organizationId === organizationId,
      );
    },
    async listByAssessment(assessmentId, organizationId) {
      return records.filter(
        (r) =>
          r.assessmentId === assessmentId &&
          r.organizationId === organizationId,
      );
    },
  };
};

// ── Drizzle (production) ───────────────────────────────────────────────────

export const createDrizzleLedgerService = (
  db: DbClient,
): LedgerServiceAdapter => ({
  async append(event) {
    // ⛔ ONLY INSERT — never update/delete (ADR-002)
    const [row] = await db
      .insert(assessmentControlEvents)
      .values({
        organizationId: event.organizationId,
        assessmentId: event.assessmentId,
        scfControlId: event.scfControlId,
        scfVersionId: event.scfVersionId,
        eventType: event.eventType,
        previousValue: event.previousValue ?? null,
        newValue: event.newValue,
        actorId: event.actorId ?? null,
        agentRunId: event.agentRunId ?? null,
        traceId: event.traceId,
        occurredAt: new Date(),
      })
      .returning();

    if (!row)
      throw new Error(
        "[Ledger] INSERT returned no row — constraint violation.",
      );
    return mapRowToRecord(row);
  },

  async listByControl(assessmentId, scfControlId, organizationId) {
    const rows = await db
      .select()
      .from(assessmentControlEvents)
      .where(
        and(
          eq(assessmentControlEvents.organizationId, organizationId),
          eq(assessmentControlEvents.assessmentId, assessmentId),
          eq(assessmentControlEvents.scfControlId, scfControlId),
        ),
      )
      .orderBy(desc(assessmentControlEvents.occurredAt));
    return rows.map(mapRowToRecord);
  },

  async listByAssessment(assessmentId, organizationId) {
    const rows = await db
      .select()
      .from(assessmentControlEvents)
      .where(
        and(
          eq(assessmentControlEvents.organizationId, organizationId),
          eq(assessmentControlEvents.assessmentId, assessmentId),
        ),
      )
      .orderBy(desc(assessmentControlEvents.occurredAt));
    return rows.map(mapRowToRecord);
  },
});
