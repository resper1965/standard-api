import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditMetadata, timestamps } from "./_helpers";
import { agentRunStatusEnum } from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    agentName: text("agent_name").notNull(),
    agentVersion: text("agent_version").notNull(),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    promptVersion: text("prompt_version").notNull(),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    status: agentRunStatusEnum("status").default("queued").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("agent_runs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("agent_runs_trace_idx").on(table.traceId),
  ],
);

export const agentDecisions = pgTable(
  "agent_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    decisionType: text("decision_type").notNull(),
    decisionSummary: text("decision_summary").notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().default([]).notNull(),
    limitations: jsonb("limitations").$type<string[]>().default([]).notNull(),
    sources: jsonb("sources")
      .$type<Record<string, unknown>[]>()
      .default([])
      .notNull(),
    confidenceScore: numeric("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_decisions_run_idx").on(table.agentRunId),
    index("agent_decisions_trace_idx").on(table.traceId),
  ],
);

export const agentToolCalls = pgTable(
  "agent_tool_calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    toolName: text("tool_name").notNull(),
    riskLevel: text("risk_level").notNull(),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    status: text("status").notNull(),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_tool_calls_run_idx").on(table.agentRunId),
    index("agent_tool_calls_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("agent_tool_calls_trace_idx").on(table.traceId),
  ],
);

export const agentUsageRecords = pgTable(
  "agent_usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    modelProvider: text("model_provider").notNull(),
    modelName: text("model_name").notNull(),
    promptTokens: integer("prompt_tokens").default(0).notNull(),
    completionTokens: integer("completion_tokens").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    embeddingTokens: integer("embedding_tokens").default(0).notNull(),
    estimatedCost: numeric("estimated_cost", { precision: 18, scale: 8 }),
    currency: text("currency").default("USD").notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_usage_records_org_idx").on(table.organizationId),
    index("agent_usage_records_assessment_idx").on(table.assessmentId),
    index("agent_usage_records_agent_run_idx").on(table.agentRunId),
    index("agent_usage_records_trace_idx").on(table.traceId),
    index("agent_usage_records_created_idx").on(table.createdAt),
  ],
);
