import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { workflowRunStatusEnum } from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    status: workflowRunStatusEnum("status").default("pending").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: jsonb("state").$type<Record<string, unknown>>().notNull(),
    signalIdempotencyKeys: jsonb("signal_idempotency_keys")
      .$type<string[]>()
      .default([])
      .notNull(),
    stepIdempotencyKeys: jsonb("step_idempotency_keys")
      .$type<string[]>()
      .default([])
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("workflow_runs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("workflow_runs_status_idx").on(table.status),
    uniqueIndex("workflow_runs_idempotency_uidx").on(table.idempotencyKey),
  ],
);

export const workflowAuditEvents = pgTable(
  "workflow_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id),
    eventType: text("event_type").notNull(),
    stepName: text("step_name"),
    actorId: uuid("actor_id"),
    systemActor: text("system_actor"),
    traceId: text("trace_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workflow_audit_events_run_idx").on(table.workflowRunId),
    index("workflow_audit_events_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("workflow_audit_events_trace_idx").on(table.traceId),
  ],
);
