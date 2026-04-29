import { SecurityEventRecordSchema, type AuditOutcome, type SecurityEventRecord, type SecurityEventType, type SecuritySeverity } from "@aegis/schemas";
import { assertMetadataSafe } from "../logger/redaction";
import type { ObservabilityDependencies } from "../repositories";

export type RecordSecurityEventInput = {
  tenant_id?: string | undefined;
  organization_id?: string | undefined;
  assessment_id?: string | undefined;
  actor_id?: string | undefined;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  outcome: AuditOutcome;
  source: string;
  resource_type?: string | undefined;
  resource_id?: string | undefined;
  message_safe: string;
  trace_id: string;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  metadata_safe?: Record<string, unknown> | undefined;
};

export class SecurityEventService {
  constructor(private readonly deps: Pick<ObservabilityDependencies, "securityEvents">) {}

  async record(input: RecordSecurityEventInput): Promise<SecurityEventRecord> {
    assertMetadataSafe(input.metadata_safe ?? {});
    return this.deps.securityEvents.create(SecurityEventRecordSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      metadata_safe: input.metadata_safe ?? {},
      created_at: new Date().toISOString()
    }));
  }
}
