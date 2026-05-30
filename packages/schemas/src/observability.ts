import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const LogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export const MetricTypeSchema = z.enum(["counter", "gauge", "histogram"]);
export const AuditOutcomeSchema = z.enum(["success", "failure", "denied", "blocked"]);
export const SecuritySeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);

export const AuditEventActionSchema = z.enum([
  "tenant_created",
  "organization_created",
  "user_invited",
  "membership_changed",
  "assessment_created",
  "assessment_updated",
  "assessment_state_changed",
  "document_uploaded",
  "document_rejected",
  "document_deleted",
  "document_reprocessed",
  "kb_index_requested",
  "kb_search_executed",
  "scf_import_started",
  "scf_import_completed",
  "scf_import_failed",
  "scope_created",
  "scope_approved",
  "soa_draft_created",
  "soa_submitted_for_review",
  "soa_approved",
  "evidence_analysis_run",
  "gap_analysis_draft_created",
  "gap_analysis_approved",
  "maturity_assessment_created",
  "maturity_approved",
  "poam_created",
  "poam_approved",
  "report_generated",
  "report_approved",
  "report_downloaded",
  "workflow_started",
  "workflow_signal_received",
  "workflow_cancelled",
  "workflow_completed",
  "agent_run_started",
  "agent_run_completed",
  "agent_run_failed",
  "approval_created",
  "approval_denied",
  "export_requested",
  "export_completed",
  // Integration-specific actions (M2M)
  "integration_text_analysis_started"
]);

export const SecurityEventTypeSchema = z.enum([
  "auth_failed",
  "unauthorized_access_attempt",
  "forbidden_access_attempt",
  "tenant_context_missing",
  "tenant_context_mismatch",
  "cross_tenant_access_blocked",
  "suspicious_upload_rejected",
  "file_type_rejected",
  "file_size_rejected",
  "prompt_injection_suspected",
  "tool_use_blocked",
  "agent_guardrail_triggered",
  "rate_limit_exceeded",
  "admin_endpoint_access_denied",
  "api_key_invalid",
  "api_key_scope_violation",
  "approval_permission_denied",
  "report_download_denied",
  "security_alert",
  "malware_detected"
]);

export const MetadataSafeSchema = z.record(z.string(), z.unknown()).default({});

export const ObservabilityTraceContextSchema = z.object({
  trace_id: TraceIdSchema,
  parent_trace_id: TraceIdSchema.optional(),
  span_id: z.string().min(8).optional(),
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  actor_id: UuidSchema.optional(),
  workflow_run_id: UuidSchema.optional(),
  agent_run_id: UuidSchema.optional(),
  request_id: z.string().min(1).optional(),
  started_at: z.string()
});

export const StructuredLogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string().min(1),
  trace_id: TraceIdSchema.optional(),
  service: z.string().min(1),
  module: z.string().min(1).optional(),
  environment: z.string().min(1),
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  metadata_safe: MetadataSafeSchema
});

export const AuditEventSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  actor_id: UuidSchema.optional(),
  actor_type: z.string().optional(),
  action: AuditEventActionSchema,
  resource_type: z.string().min(1),
  resource_id: z.string().min(1).optional(),
  outcome: AuditOutcomeSchema,
  timestamp: z.string(),
  trace_id: TraceIdSchema,
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  metadata_safe: MetadataSafeSchema,
  created_at: z.string()
});

export const SecurityEventRecordSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  actor_id: UuidSchema.optional(),
  event_type: SecurityEventTypeSchema,
  severity: SecuritySeveritySchema,
  outcome: AuditOutcomeSchema,
  source: z.string().min(1),
  resource_type: z.string().min(1).optional(),
  resource_id: z.string().min(1).optional(),
  message_safe: z.string().min(1),
  trace_id: TraceIdSchema,
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  metadata_safe: MetadataSafeSchema,
  created_at: z.string()
});

export const OperationalMetricSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  metric_name: z.string().min(1),
  metric_type: MetricTypeSchema,
  metric_value: z.number(),
  unit: z.string().min(1),
  dimensions: z.record(z.string(), z.string()).default({}),
  timestamp: z.string(),
  trace_id: TraceIdSchema,
  created_at: z.string()
});

export const CostEstimateSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3)
});

export const UsageRecordSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  service_name: z.string().min(1),
  operation_name: z.string().min(1),
  usage_quantity: z.number().nonnegative(),
  usage_unit: z.string().min(1),
  provider: z.string().optional(),
  model_name: z.string().optional(),
  resource_id: z.string().optional(),
  cost_estimate: CostEstimateSchema.optional(),
  currency: z.string().min(3).max(3).default("USD"),
  trace_id: TraceIdSchema,
  metadata_safe: MetadataSafeSchema,
  created_at: z.string()
});

export const AgentUsageRecordSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  agent_run_id: UuidSchema,
  model_provider: z.string().min(1),
  model_name: z.string().min(1),
  prompt_tokens: z.number().int().nonnegative().default(0),
  completion_tokens: z.number().int().nonnegative().default(0),
  total_tokens: z.number().int().nonnegative().default(0),
  embedding_tokens: z.number().int().nonnegative().default(0),
  estimated_cost: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  trace_id: TraceIdSchema,
  created_at: z.string()
});

export const UsageQuerySchema = z.object({
  tenant_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const AuditLogQuerySchema = UsageQuerySchema;
export const SecurityEventQuerySchema = UsageQuerySchema;
export const MetricsQuerySchema = UsageQuerySchema.extend({
  metric_name: z.string().optional()
});

export const RedactionRuleSchema = z.object({
  field: z.string().min(1),
  replacement: z.string().default("[REDACTED]")
});

export const SafeErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(z.unknown()).default([]),
    trace_id: TraceIdSchema
  })
});

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type ObservabilityTraceContext = z.infer<typeof ObservabilityTraceContextSchema>;
export type StructuredLogEntry = z.infer<typeof StructuredLogEntrySchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditEventAction = z.infer<typeof AuditEventActionSchema>;
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;
export type SecurityEventRecord = z.infer<typeof SecurityEventRecordSchema>;
export type SecurityEventType = z.infer<typeof SecurityEventTypeSchema>;
export type SecuritySeverity = z.infer<typeof SecuritySeveritySchema>;
export type OperationalMetric = z.infer<typeof OperationalMetricSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export type AgentUsageRecord = z.infer<typeof AgentUsageRecordSchema>;
export type CostEstimate = z.infer<typeof CostEstimateSchema>;
export type UsageQuery = z.infer<typeof UsageQuerySchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export type SecurityEventQuery = z.infer<typeof SecurityEventQuerySchema>;
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
export type RedactionRule = z.infer<typeof RedactionRuleSchema>;
export type SafeErrorResponse = z.infer<typeof SafeErrorResponseSchema>;

export const AUDIT_METADATA_ALLOWLIST = [
  "trace_id",
  "actor_id",
  "route",
  "method",
  "scf_version",
  "framework_id",
  "job_id",
  "assessment_id",
  "document_id",
  "scope_id",
  "soa_version_id",
  "gap_version_id",
  "poam_version_id",
  "report_version_id",
  "reason",
  "required_permissions",
  "config",
  "ip_address",
  "user_agent",
  "status",
  "details",
  "error"
] as const;
