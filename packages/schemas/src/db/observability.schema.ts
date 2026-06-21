import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditMetadata } from "./_helpers";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id"),
    organizationId: uuid("organization_id").references(() => organizations.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    traceId: text("trace_id"),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_tenant_org_idx").on(table.organizationId),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const operationalMetrics = pgTable(
  "operational_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    metricName: text("metric_name").notNull(),
    metricType: text("metric_type").notNull(),
    metricValue: numeric("metric_value", { precision: 18, scale: 6 }).notNull(),
    unit: text("unit").notNull(),
    dimensions: jsonb("dimensions")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("operational_metrics_org_idx").on(table.organizationId),
    index("operational_metrics_name_idx").on(table.metricName),
    index("operational_metrics_trace_idx").on(table.traceId),
    index("operational_metrics_created_idx").on(table.createdAt),
  ],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    serviceName: text("service_name").notNull(),
    operationName: text("operation_name").notNull(),
    usageQuantity: numeric("usage_quantity", {
      precision: 18,
      scale: 6,
    }).notNull(),
    usageUnit: text("usage_unit").notNull(),
    provider: text("provider"),
    modelName: text("model_name"),
    resourceId: text("resource_id"),
    costAmount: numeric("cost_amount", { precision: 18, scale: 8 }),
    costCurrency: text("cost_currency").default("USD"),
    currency: text("currency").default("USD").notNull(),
    traceId: text("trace_id").notNull(),
    metadataSafe: jsonb("metadata_safe")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_records_org_idx").on(table.organizationId),
    index("usage_records_service_idx").on(table.serviceName),
    index("usage_records_trace_idx").on(table.traceId),
    index("usage_records_created_idx").on(table.createdAt),
  ],
);
