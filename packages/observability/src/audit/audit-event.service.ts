import { AuditEventSchema, type AuditEvent, type AuditEventAction, type AuditOutcome } from "@aegis/schemas";
import { assertMetadataSafe } from "../logger/redaction";
import type { ObservabilityDependencies } from "../repositories";

export type RecordAuditEventInput = {
  tenant_id?: string | undefined;
  organization_id?: string | undefined;
  assessment_id?: string | undefined;
  actor_id?: string | undefined;
  actor_type?: string | undefined;
  action: AuditEventAction;
  resource_type: string;
  resource_id?: string | undefined;
  outcome: AuditOutcome;
  trace_id: string;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  metadata_safe?: Record<string, unknown> | undefined;
};

export class AuditEventService {
  constructor(private readonly deps: Pick<ObservabilityDependencies, "auditEvents">) {}

  async record(input: RecordAuditEventInput): Promise<AuditEvent> {
    assertMetadataSafe(input.metadata_safe ?? {});
    return this.deps.auditEvents.create(AuditEventSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      timestamp: new Date().toISOString(),
      metadata_safe: input.metadata_safe ?? {},
      created_at: new Date().toISOString()
    }));
  }
}
