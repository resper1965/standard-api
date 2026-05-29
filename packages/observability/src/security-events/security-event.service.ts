import { SecurityEventRecordSchema, type AuditOutcome, type SecurityEventRecord, type SecurityEventType, type SecuritySeverity } from "@standard/schemas";
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

const isUuid = (val?: string): boolean =>
  val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;

export class SecurityEventService {
  constructor(private readonly deps: Pick<ObservabilityDependencies, "securityEvents">) {}

  async record(input: RecordSecurityEventInput): Promise<SecurityEventRecord> {
    assertMetadataSafe(input.metadata_safe ?? {});
    return this.deps.securityEvents.create(SecurityEventRecordSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      tenant_id: input.tenant_id && isUuid(input.tenant_id) ? input.tenant_id : undefined,
      organization_id: input.organization_id && isUuid(input.organization_id) ? input.organization_id : undefined,
      assessment_id: input.assessment_id && isUuid(input.assessment_id) ? input.assessment_id : undefined,
      metadata_safe: input.metadata_safe ?? {},
      created_at: new Date().toISOString()
    }));
  }
}

