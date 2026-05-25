/**
 * @module @standard/auth/permissions
 * @description Standard Access Control definitions.
 *
 * Maps Standard domain resources to granular permissions.
 * Used by Better Auth's organization plugin for RBAC enforcement.
 */

/**
 * Standard permission resources and their allowed operations.
 * These are checked via `auth.api.hasPermission()` in middleware.
 */
export const STANDARD_PERMISSIONS = {
  assessment: ["read", "create", "update", "delete", "approve", "run_workflow", "cancel"] as const,
  document: ["read", "upload", "delete"] as const,
  kb: ["read", "search"] as const,
  soa: ["read", "create", "approve", "submit_review"] as const,
  gap_analysis: ["read", "create", "approve", "submit_review"] as const,
  maturity: ["read", "create", "approve", "submit_review"] as const,
  poam: ["read", "create", "approve", "submit_review"] as const,
  report: ["read", "generate", "export"] as const,
  agent: ["run", "read"] as const,
  organization: ["read", "update", "manage_members"] as const,
  admin: ["manage_users", "manage_orgs", "impersonate"] as const,
  // Platform-level: only platform_admin (cross-tenant operators) can use these.
  platform: ["manage_tenants", "read_all"] as const,
} as const;

export type StandardResource = keyof typeof STANDARD_PERMISSIONS;
export type StandardPermission<R extends StandardResource = StandardResource> =
  `${R}:${(typeof STANDARD_PERMISSIONS)[R][number]}`;

/**
 * Role-permission mapping for the Standard platform.
 * Better Auth uses these to enforce access control via organization plugin.
 */
export const STANDARD_ROLE_PERMISSIONS = {
  owner: {
    assessment: ["read", "create", "update", "delete", "approve", "run_workflow", "cancel"],
    document: ["read", "upload", "delete"],
    kb: ["read", "search"],
    soa: ["read", "create", "approve", "submit_review"],
    gap_analysis: ["read", "create", "approve", "submit_review"],
    maturity: ["read", "create", "approve", "submit_review"],
    poam: ["read", "create", "approve", "submit_review"],
    report: ["read", "generate", "export"],
    agent: ["run", "read"],
    organization: ["read", "update", "manage_members"],
    admin: ["manage_users", "manage_orgs", "impersonate"],
  },
  admin: {
    assessment: ["read", "create", "update", "approve", "run_workflow", "cancel"],
    document: ["read", "upload", "delete"],
    kb: ["read", "search"],
    soa: ["read", "create", "approve", "submit_review"],
    gap_analysis: ["read", "create", "approve", "submit_review"],
    maturity: ["read", "create", "approve", "submit_review"],
    poam: ["read", "create", "approve", "submit_review"],
    report: ["read", "generate", "export"],
    agent: ["run", "read"],
    organization: ["read", "update", "manage_members"],
    admin: ["manage_users", "manage_orgs"],
  },
  member: {
    assessment: ["read", "create", "update", "run_workflow"],
    document: ["read", "upload"],
    kb: ["read", "search"],
    soa: ["read", "create"],
    gap_analysis: ["read", "create"],
    maturity: ["read", "create"],
    poam: ["read", "create"],
    report: ["read"],
    agent: ["read"],
    organization: ["read"],
  },
  viewer: {
    assessment: ["read"],
    document: ["read"],
    kb: ["read", "search"],
    soa: ["read"],
    gap_analysis: ["read"],
    maturity: ["read"],
    poam: ["read"],
    report: ["read"],
    agent: ["read"],
    organization: ["read"],
  },
} as const;

export type StandardRole = keyof typeof STANDARD_ROLE_PERMISSIONS;

/**
 * Check if a role has a specific permission.
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

