import type { AgentUsageRecord, AuditEvent, OperationalMetric, SecurityEventRecord, UsageRecord } from "@standard/schemas";

export type ObservabilityRepository<T extends { id: string; created_at?: string | undefined; trace_id: string }> = {
  create(record: T): Promise<T>;
  get(id: string): Promise<T | null>;
  list(filter?: { tenant_id?: string | undefined; assessment_id?: string | undefined; limit?: number | undefined }): Promise<T[]>;
};

const matches = <T extends { tenant_id?: string | undefined; assessment_id?: string | undefined }>(
  record: T,
  filter?: { tenant_id?: string | undefined; assessment_id?: string | undefined }
): boolean =>
  (!filter?.tenant_id || record.tenant_id === filter.tenant_id) &&
  (!filter?.assessment_id || record.assessment_id === filter.assessment_id);

export const createInMemoryRepository = <T extends { id: string; trace_id: string; tenant_id?: string | undefined; assessment_id?: string | undefined }>() => {
  const records = new Map<string, T>();
  return {
    async create(record: T) {
      records.set(record.id, record);
      return record;
    },
    async get(id: string) {
      return records.get(id) ?? null;
    },
    async list(filter?: { tenant_id?: string | undefined; assessment_id?: string | undefined; limit?: number | undefined }) {
      return [...records.values()].filter((record) => matches(record, filter)).slice(0, filter?.limit ?? 25);
    }
  } satisfies ObservabilityRepository<T>;
};

export type ObservabilityDependencies = {
  auditEvents: ObservabilityRepository<AuditEvent>;
  securityEvents: ObservabilityRepository<SecurityEventRecord>;
  metrics: ObservabilityRepository<OperationalMetric>;
  usage: ObservabilityRepository<UsageRecord>;
  agentUsage: ObservabilityRepository<AgentUsageRecord>;
};

export const createInMemoryObservabilityDependencies = (): ObservabilityDependencies => ({
  auditEvents: createInMemoryRepository<AuditEvent>(),
  securityEvents: createInMemoryRepository<SecurityEventRecord>(),
  metrics: createInMemoryRepository<OperationalMetric>(),
  usage: createInMemoryRepository<UsageRecord>(),
  agentUsage: createInMemoryRepository<AgentUsageRecord>()
});

