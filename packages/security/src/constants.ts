import type { FileSecurityPolicy, Permission, Role } from "@standard/schemas";

export const ALL_PERMISSIONS = [
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
  "document:write",
  "kb:index",
  "kb:search",
  "kb:read",
  "kb:write",
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
  "admin:create",
  "admin:delete",
  "admin:approve",
  "audit:read",
  "webhook:create",
  "webhook:read",
  "webhook:update",
  "webhook:delete",
  "artifact:create",
  "artifact:read",
  "artifact:update",
  "artifact:approve",
  "approval:create",
  "approval:read",
  "privacy:create",
  "privacy:read",
  "privacy:update",
  "privacy:delete",
  "intelligence:read",
  "intelligence:create",
] as const satisfies readonly Permission[];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  platform_admin: [...ALL_PERMISSIONS],
  organization_admin: [
    // Organization (own org only — no cross-tenant, no org:create)
    "organization:read",
    "organization:update",
    "membership:manage",
    // Assessment — full lifecycle
    "assessment:create",
    "assessment:read",
    "assessment:update",
    "assessment:delete",
    "assessment:run_workflow",
    "assessment:close",
    "assessment:cancel",
    // Documents
    "document:upload",
    "document:read",
    "document:delete",
    "document:reprocess",
    "document:write",
    // KB
    "kb:index",
    "kb:search",
    "kb:read",
    "kb:write",
    // SCF (read + import; scf:admin is platform-only)
    "scf:read",
    "scf:import",
    "scf:create",
    // Scope
    "scope:create",
    "scope:update",
    "scope:approve",
    // SOA
    "soa:create",
    "soa:update",
    "soa:submit_review",
    "soa:approve",
    "soa:read",
    // Evidence
    "evidence:run",
    "evidence:read",
    // Gap
    "gap:create",
    "gap:update",
    "gap:submit_review",
    "gap:approve",
    "gap:read",
    // Maturity
    "maturity:create",
    "maturity:update",
    "maturity:submit_review",
    "maturity:approve",
    "maturity:read",
    // POAM
    "poam:create",
    "poam:update",
    "poam:submit_review",
    "poam:approve",
    "poam:read",
    // Reports
    "report:create",
    "report:render",
    "report:approve",
    "report:read",
    "report:download",
    "report:update",
    // Agents
    "agent:run",
    "agent:dry_run",
    "agent:read_runs",
    "agent:read",
    "agent:create",
    // Approvals & artifacts
    "approval:create",
    "approval:read",
    "artifact:create",
    "artifact:read",
    "artifact:update",
    "artifact:approve",
    // Webhooks
    "webhook:create",
    "webhook:read",
    "webhook:update",
    "webhook:delete",
    // Privacy / ROPA
    "privacy:create",
    "privacy:read",
    "privacy:update",
    "privacy:delete",
    // Intelligence
    "intelligence:read",
    "intelligence:create",
    // Audit (scoped to own org by the audit repository)
    "audit:read",
  ],
};

/**
 * Maps Better Auth organization roles (from memberships table) to Standard GRC roles.
 * All org members share the organization_admin role — permission scoping is handled
 * at the API key scope level for M2M, and by tenant isolation for browser sessions.
 */
export const ORG_ROLE_TO_GRC_ROLE: Record<string, Role> = {
  owner: "organization_admin",
  admin: "organization_admin",
  member: "organization_admin",
};

/**
 * Resolves a Better Auth org role to a Standard GRC role.
 * Returns null if the org role is unknown (defensive — should never happen).
 */
export const resolveGrcRoleFromOrgRole = (orgRole: string): Role | null => {
  return ORG_ROLE_TO_GRC_ROLE[orgRole] ?? null;
};

export const DEFAULT_FILE_SECURITY_POLICY: FileSecurityPolicy = {
  max_file_size_bytes: 10 * 1024 * 1024,
  allowed_extensions: ["pdf", "docx", "txt", "md", "markdown", "csv", "json"],
  allowed_mime_types: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/csv",
    "application/json",
    "text/json",
  ],
  require_content_hash: true,
  require_malware_scan: true,
  quarantine_on_rejection: true,
};
