/**
 * @module @standard/auth/permissions
 * @description Standard API Access Control.
 *
 * API-first RBAC: roles define what API endpoints a consumer can call.
 * GRC workflow semantics (who drafts vs who approves) are business logic
 * handled by the assessment engine — NOT by API RBAC.
 *
 * Roles are API access levels, not GRC workflow participants:
 *   owner  — full org API access
 *   admin  — manage org, settings, members + all operational endpoints
 *   member — standard API access (create, read, update, submit, run)
 *   viewer — read-only API access
 *
 * Source of truth for the Permission enum: packages/schemas/src/security.ts
 */

/**
 * API permission resources and their allowed operations.
 * Every permission declared in route definitions MUST exist here.
 */
export const STANDARD_PERMISSIONS = {
  // --- Tenant & Organization ---
  tenant: ["read", "update"] as const,
  organization: ["create", "read", "update"] as const,
  membership: ["manage"] as const,

  // --- Assessment Lifecycle ---
  assessment: ["create", "read", "update", "delete", "run_workflow", "close", "cancel"] as const,
  document: ["upload", "read", "delete", "reprocess"] as const,
  kb: ["index", "search"] as const,
  scf: ["read", "import", "admin"] as const,
  scope: ["create", "update", "approve"] as const,
  soa: ["create", "update", "submit_review", "approve", "read"] as const,
  evidence: ["run", "read"] as const,
  gap: ["create", "update", "submit_review", "approve", "read"] as const,
  maturity: ["create", "update", "submit_review", "approve", "read"] as const,
  poam: ["create", "update", "submit_review", "approve", "read"] as const,
  report: ["create", "render", "approve", "read", "download"] as const,

  // --- Agent Runtime ---
  agent: ["run", "dry_run", "read_runs", "admin"] as const,

  // --- Administration & Audit ---
  admin: ["read", "write"] as const,
  audit: ["read"] as const,

  // --- Platform (cross-tenant, platform_admin only) ---
  platform: ["manage_tenants", "read_all"] as const,
} as const;

export type StandardResource = keyof typeof STANDARD_PERMISSIONS;
export type StandardPermission<R extends StandardResource = StandardResource> =
  `${R}:${(typeof STANDARD_PERMISSIONS)[R][number]}`;

/**
 * API access roles and their permission mappings.
 *
 * These are API access levels — not GRC workflow roles.
 * GRC concepts like "who approves a SoA" are assessment-engine
 * business logic, enforced per-assessment, not per-API-role.
 */
export const STANDARD_ROLE_PERMISSIONS = {
  /** Organization owner — full API access */
  owner: {
    tenant: ["read", "update"],
    organization: ["create", "read", "update"],
    membership: ["manage"],
    assessment: ["create", "read", "update", "delete", "run_workflow", "close", "cancel"],
    document: ["upload", "read", "delete", "reprocess"],
    kb: ["index", "search"],
    scf: ["read", "import", "admin"],
    scope: ["create", "update", "approve"],
    soa: ["create", "update", "submit_review", "approve", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "approve", "read"],
    maturity: ["create", "update", "submit_review", "approve", "read"],
    poam: ["create", "update", "submit_review", "approve", "read"],
    report: ["create", "render", "approve", "read", "download"],
    agent: ["run", "dry_run", "read_runs", "admin"],
    admin: ["read", "write"],
    audit: ["read"],
  },

  /** Organization admin — manage org + all operational endpoints */
  admin: {
    tenant: ["read"],
    organization: ["read", "update"],
    membership: ["manage"],
    assessment: ["create", "read", "update", "run_workflow", "close", "cancel"],
    document: ["upload", "read", "delete", "reprocess"],
    kb: ["index", "search"],
    scf: ["read", "import"],
    scope: ["create", "update", "approve"],
    soa: ["create", "update", "submit_review", "approve", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "approve", "read"],
    maturity: ["create", "update", "submit_review", "approve", "read"],
    poam: ["create", "update", "submit_review", "approve", "read"],
    report: ["create", "render", "approve", "read", "download"],
    agent: ["run", "dry_run", "read_runs", "admin"],
    admin: ["read", "write"],
    audit: ["read"],
  },

  /** Standard API consumer — create, read, update, submit, run */
  member: {
    organization: ["read"],
    assessment: ["create", "read", "update", "run_workflow"],
    document: ["upload", "read", "reprocess"],
    kb: ["index", "search"],
    scf: ["read"],
    scope: ["create", "update"],
    soa: ["create", "update", "submit_review", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "read"],
    maturity: ["create", "update", "submit_review", "read"],
    poam: ["create", "update", "submit_review", "read"],
    report: ["create", "read", "download"],
    agent: ["run", "read_runs"],
    audit: ["read"],
  },

  /** Read-only API access */
  viewer: {
    organization: ["read"],
    assessment: ["read"],
    document: ["read"],
    kb: ["search"],
    scf: ["read"],
    soa: ["read"],
    evidence: ["read"],
    gap: ["read"],
    maturity: ["read"],
    poam: ["read"],
    report: ["read", "download"],
    agent: ["read_runs"],
    audit: ["read"],
  },

  // ─── GRC Roles Alignment ───────────────────────────────────────────
  
  platform_admin: {
    tenant: ["read", "update"],
    organization: ["create", "read", "update"],
    membership: ["manage"],
    assessment: ["create", "read", "update", "delete", "run_workflow", "close", "cancel"],
    document: ["upload", "read", "delete", "reprocess"],
    kb: ["index", "search"],
    scf: ["read", "import", "admin"],
    scope: ["create", "update", "approve"],
    soa: ["create", "update", "submit_review", "approve", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "approve", "read"],
    maturity: ["create", "update", "submit_review", "approve", "read"],
    poam: ["create", "update", "submit_review", "approve", "read"],
    report: ["create", "render", "approve", "read", "download"],
    agent: ["run", "dry_run", "read_runs", "admin"],
    admin: ["read", "write"],
    audit: ["read"],
  },

  tenant_admin: {
    tenant: ["read", "update"],
    organization: ["create", "read", "update"],
    membership: ["manage"],
    assessment: ["create", "read", "update"],
    audit: ["read"],
  },

  organization_admin: {
    organization: ["read", "update"],
    assessment: ["create", "read", "update"],
    document: ["upload", "read"],
    kb: ["index", "search"],
    soa: ["read"],
    gap: ["read"],
    poam: ["read"],
    report: ["read"],
  },

  assessment_owner: {
    assessment: ["read", "update", "run_workflow", "cancel"],
    document: ["upload", "read", "reprocess"],
    kb: ["index", "search"],
    scope: ["create", "update"],
    soa: ["create", "update", "submit_review", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "read"],
    maturity: ["create", "update", "submit_review", "read"],
    poam: ["create", "update", "submit_review", "read"],
    report: ["create", "render", "read", "download"],
    agent: ["run", "read_runs"],
  },

  assessor: {
    assessment: ["read"],
    document: ["upload", "read", "reprocess"],
    kb: ["index", "search"],
    scope: ["create", "update"],
    soa: ["create", "update", "submit_review", "read"],
    evidence: ["run", "read"],
    gap: ["create", "update", "submit_review", "read"],
    poam: ["create", "update", "submit_review", "read"],
    report: ["create", "render", "read"],
    agent: ["run", "read_runs"],
  },

  reviewer: {
    assessment: ["read"],
    document: ["read"],
    kb: ["search"],
    soa: ["read"],
    gap: ["read"],
    maturity: ["read"],
    poam: ["read"],
    report: ["read"],
  },

  approver: {
    assessment: ["read"],
    document: ["read"],
    kb: ["search"],
    soa: ["read", "approve"],
    gap: ["read", "approve"],
    maturity: ["read", "approve"],
    poam: ["read", "approve"],
    report: ["read", "approve", "download"],
  },

  auditor_readonly: {
    assessment: ["read"],
    soa: ["read"],
    gap: ["read"],
    maturity: ["read"],
    poam: ["read"],
    report: ["read", "download"],
    audit: ["read"],
  },

  integration_service: {
    assessment: ["read"],
    document: ["upload", "read"],
    kb: ["index", "search"],
    report: ["read"],
  },

  support_readonly: {
    tenant: ["read"],
    organization: ["read"],
    assessment: ["read"],
    audit: ["read"],
  },

  system: {
    assessment: ["read", "update", "run_workflow"],
    kb: ["index"],
    agent: ["run", "read_runs"],
    report: ["render"],
  },
} as const;

export type StandardRole = keyof typeof STANDARD_ROLE_PERMISSIONS;

/**
 * Check if an API role has a specific permission.
 */
export const roleHasPermission = (
  role: StandardRole,
  resource: StandardResource,
  action: string
): boolean => {
  const perms = STANDARD_ROLE_PERMISSIONS[role];
  if (!perms) return false;
  const resourcePerms = perms[resource as keyof typeof perms] as readonly string[] | undefined;
  if (!resourcePerms) return false;
  return resourcePerms.includes(action);
};
