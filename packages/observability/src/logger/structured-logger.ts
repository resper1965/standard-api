import { StructuredLogEntrySchema, type LogLevel, type StructuredLogEntry } from "@aegis/schemas";
import { redactValue } from "./redaction";

export type LogInput = {
  level: LogLevel;
  message: string;
  trace_id?: string | undefined;
  service: string;
  module?: string | undefined;
  environment: string;
  tenant_id?: string | undefined;
  organization_id?: string | undefined;
  assessment_id?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export class StructuredLogger {
  entries: StructuredLogEntry[] = [];

  log(input: LogInput): StructuredLogEntry {
    const entry = StructuredLogEntrySchema.parse({
      timestamp: new Date().toISOString(),
      level: input.level,
      message: input.message,
      ...(input.trace_id ? { trace_id: input.trace_id } : {}),
      service: input.service,
      ...(input.module ? { module: input.module } : {}),
      environment: input.environment,
      ...(input.tenant_id ? { tenant_id: input.tenant_id } : {}),
      ...(input.organization_id ? { organization_id: input.organization_id } : {}),
      ...(input.assessment_id ? { assessment_id: input.assessment_id } : {}),
      metadata_safe: redactValue(input.metadata ?? {})
    });
    this.entries.push(entry);
    console.log(JSON.stringify(entry));
    return entry;
  }
}
