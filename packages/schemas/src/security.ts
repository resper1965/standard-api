import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const ActorTypeSchema = z.enum(["user", "service_account", "system", "agent_runtime", "workflow"]);
export const AuthMethodSchema = z.enum(["jwt", "api_key", "cloudflare_access", "service_token", "mock_dev"]);

export const RoleSchema = z.enum([
  "platform_admin",
  "tenant_admin",
  "organization_admin",
  "assessment_owner",
  "assessor",
  "reviewer",
  "approver",
  "auditor_readonly",
  "integration_service",
  "support_readonly",
  "system"
]);

export const PermissionSchema = z.enum([
  "tenant:read",
  "tenant:update",
  "organization:create",
  "organization:read",
  "organization:update",
  "membership:manage",
  "assessment:create",
  "assessment:read",
  "assessment:update",
  "assessment:delete",
  "assessment:run_workflow",
  "assessment:close",
  "assessment:cancel",
  "document:upload",
  "document:read",
  "document:delete",
  "document:reprocess",
  "kb:index",
  "kb:search",
  "scf:read",
  "scf:import",
  "scf:admin",
  "scf:create",
  "scope:create",
  "scope:update",
  "scope:approve",
  "soa:create",
  "soa:update",
  "soa:submit_review",
  "soa:approve",
  "soa:read",
  "evidence:run",
  "evidence:read",
  "gap:create",
  "gap:update",
  "gap:submit_review",
  "gap:approve",
  "gap:read",
  "maturity:create",
  "maturity:update",
  "maturity:submit_review",
  "maturity:approve",
  "maturity:read",
  "poam:create",
  "poam:update",
  "poam:submit_review",
  "poam:approve",
  "poam:read",
  "report:create",
  "report:render",
  "report:approve",
  "report:read",
  "report:download",
  "report:update",
  "agent:run",
  "agent:dry_run",
  "agent:read_runs",
  "agent:read",
  "agent:create",
  "agent:admin",
  "admin:read",
  "admin:write",
  "audit:read",
  // Webhook management
  "webhook:create",
  "webhook:read",
  "webhook:update",
  "webhook:delete",
  // Artifact versioning
  "artifact:create",
  "artifact:read",
  "artifact:update",
  "artifact:approve",
  // Approvals
  "approval:create",
  "approval:read",
  // Privacy & Data Subject
  "privacy:create",
  "privacy:read",
  "privacy:update",
  // Intelligence
  "intelligence:read",
  "intelligence:create",
  // Additional RBAC coverage
  "admin:create",
  "admin:delete",
  "admin:approve",
  "privacy:delete",
  "document:write",
  "kb:read",
  "kb:write",
]);

export const AuthContextSchema = z.object({
  actor_id: UuidSchema,
  actor_type: ActorTypeSchema,
  organization_id: UuidSchema.optional(),
  organization_ids: z.array(UuidSchema).default([]),
  roles: z.array(RoleSchema).default([]),
  permissions: z.array(PermissionSchema).default([]),
  auth_method: AuthMethodSchema,
  session_id: z.string().min(1).optional(),
  api_key_id: z.string().min(1).optional(),
  issued_at: z.string(),
  expires_at: z.string().optional(),
  trace_id: TraceIdSchema
});

export const SecurityTenantContextSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema.optional(),
  hostname: z.string().optional(),
  source: z.enum(["jwt", "api_key", "hostname", "header", "route_param", "internal_worker"]),
  resolved_at: z.string(),
  trace_id: TraceIdSchema
});

export const AccessDeniedReasonSchema = z.enum([
  "missing_auth_context",
  "missing_tenant_context",
  "permission_missing",
  "tenant_mismatch",
  "organization_mismatch",
  "assessment_mismatch",
  "mock_auth_forbidden_in_production",
  "policy_not_configured"
]);

export const AccessDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: AccessDeniedReasonSchema.optional(),
  required_permissions: z.array(PermissionSchema).default([]),
  granted_permissions: z.array(PermissionSchema).default([]),
  trace_id: TraceIdSchema
});

export const PolicyInputSchema = z.object({
  auth: AuthContextSchema.optional(),
  tenant: SecurityTenantContextSchema.optional(),
  required_permissions: z.array(PermissionSchema).default([]),
  trace_id: TraceIdSchema
});

export const PolicyResultSchema = AccessDecisionSchema;

export const ApiKeyScopeSchema = z.object({
  api_key_id: z.string().min(1),
  organization_id: UuidSchema,
  organization_ids: z.array(UuidSchema).default([]),
  permissions: z.array(PermissionSchema).default([])
});

export const ServiceAccountSchema = z.object({
  service_account_id: UuidSchema,
  organization_id: UuidSchema.optional(),
  roles: z.array(RoleSchema).default([]),
  permissions: z.array(PermissionSchema).default([]),
  status: z.enum(["active", "disabled"]).default("active")
});

export const SecurityEventSchema = z.object({
  event_type: z.string().min(1),
  actor_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  assessment_id: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const FileSecurityPolicySchema = z.object({
  max_file_size_bytes: z.number().int().positive(),
  allowed_extensions: z.array(z.string().min(1)),
  allowed_mime_types: z.array(z.string().min(1)),
  require_content_hash: z.boolean(),
  require_malware_scan: z.boolean(),
  quarantine_on_rejection: z.boolean()
});

export const FileValidationSecurityResultSchema = z.object({
  accepted: z.boolean(),
  normalized_filename: z.string().min(1),
  content_hash: z.string().optional(),
  rejection_reasons: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  quarantine_required: z.boolean()
});

export const PromptContentTrustLevelSchema = z.enum(["trusted_system", "trusted_tool", "untrusted_evidence", "untrusted_user"]);

export const ToolUsePolicySchema = z.object({
  agent_id: z.string().min(1),
  allowed_tools: z.array(z.string().min(1)),
  denied_tools: z.array(z.string().min(1)).default([]),
  external_calls_allowed: z.boolean().default(false),
  approval_tools_allowed: z.boolean().default(false)
});

export type ActorType = z.infer<typeof ActorTypeSchema>;
export type AuthMethod = z.infer<typeof AuthMethodSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type AuthContext = z.infer<typeof AuthContextSchema>;
export type SecurityTenantContext = z.infer<typeof SecurityTenantContextSchema>;
export type AccessDecision = z.infer<typeof AccessDecisionSchema>;
export type AccessDeniedReason = z.infer<typeof AccessDeniedReasonSchema>;
export type PolicyInput = z.infer<typeof PolicyInputSchema>;
export type PolicyResult = z.infer<typeof PolicyResultSchema>;
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;
export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
export type FileSecurityPolicy = z.infer<typeof FileSecurityPolicySchema>;
export type FileValidationSecurityResult = z.infer<typeof FileValidationSecurityResultSchema>;
export type PromptContentTrustLevel = z.infer<typeof PromptContentTrustLevelSchema>;
export type ToolUsePolicy = z.infer<typeof ToolUsePolicySchema>;
