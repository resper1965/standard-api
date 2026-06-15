// @ts-nocheck -- Zod v4 CI type compat
import { SecurityEventRecordSchema, type AuditOutcome, type SecurityEventRecord, type SecurityEventType, type SecuritySeverity } from "@standard/schemas";
import { assertMetadataSafe } from "../logger/redaction";
import type { ObservabilityDependencies } from "../repositories";

export type RecordSecurityEventInput = {
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
    const actorId = input.actor_id && isUuid(input.actor_id) ? input.actor_id : undefined;
    const originalActorId = input.actor_id && !isUuid(input.actor_id) ? input.actor_id : undefined;
    return this.deps.securityEvents.create(SecurityEventRecordSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      organization_id: input.organization_id && isUuid(input.organization_id) ? input.organization_id : undefined,
      assessment_id: input.assessment_id && isUuid(input.assessment_id) ? input.assessment_id : undefined,
      actor_id: actorId,
      metadata_safe: {
        ...(input.metadata_safe ?? {}),
        ...(originalActorId ? { original_actor_id: originalActorId } : {})
      },
      created_at: new Date().toISOString()
    }));
  }
}


