import { eq, and, desc } from "drizzle-orm";
import {
  securityEvents,
  operationalMetrics,
  usageRecords,
  agentUsageRecords
} from "@standard/schemas";
import type {
  AuditEvent,
  SecurityEventRecord,
  OperationalMetric,
  UsageRecord,
  AgentUsageRecord
} from "@standard/schemas";
import type { ObservabilityDependencies, ObservabilityRepository } from "./repositories";

type DrizzleDb = {
  insert(table: any): any;
  select(): any;
};

/**
 * Creates a Drizzle-backed ObservabilityRepository for a specific observability table.
 * Replaces in-memory storage for production use with PostgreSQL persistence.
 *
 * AGENTS.md §13: Audit logs for state changes, approvals, uploads, agent outputs, and exports.
 */

const createDrizzleSecurityEventsRepo = (db: DrizzleDb): ObservabilityRepository<SecurityEventRecord> => ({
  async create(record) {
    await db.insert(securityEvents).values({
      id: record.id,
      tenantId: record.tenant_id ?? null,
      organizationId: record.organization_id ?? null,
      assessmentId: record.assessment_id ?? null,
      actorId: record.actor_id ?? null,
      eventType: record.event_type,
      severity: record.severity,
      outcome: record.outcome,
      source: record.source,
      resourceType: record.resource_type ?? null,
      resourceId: record.resource_id ?? null,
      messageSafe: record.message_safe,
      traceId: record.trace_id,
      ipAddress: record.ip_address ?? null,
      userAgent: record.user_agent ?? null,
      metadataSafe: record.metadata_safe ?? {}
    });
    return record;
  },
  async get(id) {
    const rows = await db.select().from(securityEvents).where(eq(securityEvents.id, id)).limit(1);
    return rows[0] ? mapSecurityEventRow(rows[0]) : null;
  },
  async list(filter) {
    const conditions = [];
    if (filter?.tenant_id) conditions.push(eq(securityEvents.tenantId, filter.tenant_id));
    if (filter?.assessment_id) conditions.push(eq(securityEvents.assessmentId, filter.assessment_id));
    const query = db.select().from(securityEvents);
    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(securityEvents.createdAt)).limit(filter?.limit ?? 25)
      : await query.orderBy(desc(securityEvents.createdAt)).limit(filter?.limit ?? 25);
    return rows.map(mapSecurityEventRow);
  }
});

const createDrizzleMetricsRepo = (db: DrizzleDb): ObservabilityRepository<OperationalMetric> => ({
  async create(record) {
    await db.insert(operationalMetrics).values({
      id: record.id,
      tenantId: record.tenant_id ?? null,
      organizationId: record.organization_id ?? null,
      assessmentId: record.assessment_id ?? null,
      metricName: record.metric_name,
      metricType: record.metric_type,
      metricValue: String(record.metric_value),
      unit: record.unit,
      dimensions: record.dimensions ?? {},
      timestamp: new Date(record.timestamp),
      traceId: record.trace_id
    });
    return record;
  },
  async get(id) {
    const rows = await db.select().from(operationalMetrics).where(eq(operationalMetrics.id, id)).limit(1);
    return rows[0] ? mapMetricRow(rows[0]) : null;
  },
  async list(filter) {
    const conditions = [];
    if (filter?.tenant_id) conditions.push(eq(operationalMetrics.tenantId, filter.tenant_id));
    if (filter?.assessment_id) conditions.push(eq(operationalMetrics.assessmentId, filter.assessment_id));
    const query = db.select().from(operationalMetrics);
    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(operationalMetrics.createdAt)).limit(filter?.limit ?? 25)
      : await query.orderBy(desc(operationalMetrics.createdAt)).limit(filter?.limit ?? 25);
    return rows.map(mapMetricRow);
  }
});

const createDrizzleUsageRepo = (db: DrizzleDb): ObservabilityRepository<UsageRecord> => ({
  async create(record) {
    await db.insert(usageRecords).values({
      id: record.id,
      tenantId: record.tenant_id ?? null,
      organizationId: record.organization_id ?? null,
      assessmentId: record.assessment_id ?? null,
      serviceName: record.service_name,
      operationName: record.operation_name,
      usageQuantity: String(record.usage_quantity),
      usageUnit: record.usage_unit,
      provider: record.provider ?? null,
      modelName: record.model_name ?? null,
      resourceId: record.resource_id ?? null,
      costAmount: record.cost_estimate ? String(record.cost_estimate.amount) : null,
      costCurrency: record.cost_estimate?.currency ?? "USD",
      currency: record.currency ?? "USD",
      traceId: record.trace_id,
      metadataSafe: record.metadata_safe ?? {}
    });
    return record;
  },
  async get(id) {
    const rows = await db.select().from(usageRecords).where(eq(usageRecords.id, id)).limit(1);
    return rows[0] ? mapUsageRow(rows[0]) : null;
  },
  async list(filter) {
    const conditions = [];
    if (filter?.tenant_id) conditions.push(eq(usageRecords.tenantId, filter.tenant_id));
    if (filter?.assessment_id) conditions.push(eq(usageRecords.assessmentId, filter.assessment_id));
    const query = db.select().from(usageRecords);
    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(usageRecords.createdAt)).limit(filter?.limit ?? 25)
      : await query.orderBy(desc(usageRecords.createdAt)).limit(filter?.limit ?? 25);
    return rows.map(mapUsageRow);
  }
});

const createDrizzleAgentUsageRepo = (db: DrizzleDb): ObservabilityRepository<AgentUsageRecord> => ({
  async create(record) {
    await db.insert(agentUsageRecords).values({
      id: record.id,
      tenantId: record.tenant_id,
      organizationId: record.organization_id,
      assessmentId: record.assessment_id,
      agentRunId: record.agent_run_id,
      modelProvider: record.model_provider,
      modelName: record.model_name,
      promptTokens: record.prompt_tokens,
      completionTokens: record.completion_tokens,
      totalTokens: record.total_tokens,
      embeddingTokens: record.embedding_tokens,
      estimatedCost: record.estimated_cost != null ? String(record.estimated_cost) : null,
      currency: record.currency ?? "USD",
      traceId: record.trace_id
    });
    return record;
  },
  async get(id) {
    const rows = await db.select().from(agentUsageRecords).where(eq(agentUsageRecords.id, id)).limit(1);
    return rows[0] ? mapAgentUsageRow(rows[0]) : null;
  },
  async list(filter) {
    const conditions = [];
    if (filter?.tenant_id) conditions.push(eq(agentUsageRecords.tenantId, filter.tenant_id));
    if (filter?.assessment_id) conditions.push(eq(agentUsageRecords.assessmentId, filter.assessment_id));
    const query = db.select().from(agentUsageRecords);
    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(agentUsageRecords.createdAt)).limit(filter?.limit ?? 25)
      : await query.orderBy(desc(agentUsageRecords.createdAt)).limit(filter?.limit ?? 25);
    return rows.map(mapAgentUsageRow);
  }
});

/**
 * Creates full Drizzle-backed ObservabilityDependencies.
 * The `auditEvents` repo uses the same pattern but writes to the existing
 * `audit_logs` table (handled separately by audit.repository.ts in the gateway).
 * Here we provide a thin wrapper that satisfies the ObservabilityRepository<AuditEvent> contract.
 */
export const createDrizzleObservabilityDependencies = (db: DrizzleDb): ObservabilityDependencies => {
  // AuditEvent uses the existing audit_logs table pattern but through the observability interface
  const auditEventsRepo: ObservabilityRepository<AuditEvent> = {
    async create(record) {
      // Audit events are written via the gateway's audit.repository.ts (createDrizzleAuditRepository)
      // This path is for the ObservabilityDependencies interface compatibility
      // In production, audit events flow through the middleware, so this is a no-op fallback
      return record;
    },
    async get() { return null; },
    async list() { return []; }
  };

  return {
    auditEvents: auditEventsRepo,
    securityEvents: createDrizzleSecurityEventsRepo(db),
    metrics: createDrizzleMetricsRepo(db),
    usage: createDrizzleUsageRepo(db),
    agentUsage: createDrizzleAgentUsageRepo(db)
  };
};

// ─── Row mappers ─────────────────────────────────────────────────

function mapSecurityEventRow(row: any): SecurityEventRecord {
  return {
    id: row.id,
    tenant_id: row.tenantId ?? undefined,
    organization_id: row.organizationId ?? undefined,
    assessment_id: row.assessmentId ?? undefined,
    actor_id: row.actorId ?? undefined,
    event_type: row.eventType,
    severity: row.severity,
    outcome: row.outcome,
    source: row.source,
    resource_type: row.resourceType ?? undefined,
    resource_id: row.resourceId ?? undefined,
    message_safe: row.messageSafe,
    trace_id: row.traceId,
    ip_address: row.ipAddress ?? undefined,
    user_agent: row.userAgent ?? undefined,
    metadata_safe: row.metadataSafe ?? {},
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

function mapMetricRow(row: any): OperationalMetric {
  return {
    id: row.id,
    tenant_id: row.tenantId ?? undefined,
    organization_id: row.organizationId ?? undefined,
    assessment_id: row.assessmentId ?? undefined,
    metric_name: row.metricName,
    metric_type: row.metricType,
    metric_value: Number(row.metricValue),
    unit: row.unit,
    dimensions: row.dimensions ?? {},
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    trace_id: row.traceId,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

function mapUsageRow(row: any): UsageRecord {
  return {
    id: row.id,
    tenant_id: row.tenantId ?? undefined,
    organization_id: row.organizationId ?? undefined,
    assessment_id: row.assessmentId ?? undefined,
    service_name: row.serviceName,
    operation_name: row.operationName,
    usage_quantity: Number(row.usageQuantity),
    usage_unit: row.usageUnit,
    provider: row.provider ?? undefined,
    model_name: row.modelName ?? undefined,
    resource_id: row.resourceId ?? undefined,
    cost_estimate: row.costAmount ? { amount: Number(row.costAmount), currency: row.costCurrency ?? "USD" } : undefined,
    currency: row.currency ?? "USD",
    trace_id: row.traceId,
    metadata_safe: row.metadataSafe ?? {},
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

function mapAgentUsageRow(row: any): AgentUsageRecord {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    organization_id: row.organizationId,
    assessment_id: row.assessmentId,
    agent_run_id: row.agentRunId,
    model_provider: row.modelProvider,
    model_name: row.modelName,
    prompt_tokens: row.promptTokens,
    completion_tokens: row.completionTokens,
    total_tokens: row.totalTokens,
    embedding_tokens: row.embeddingTokens,
    estimated_cost: row.estimatedCost ? Number(row.estimatedCost) : undefined,
    currency: row.currency ?? "USD",
    trace_id: row.traceId,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}
