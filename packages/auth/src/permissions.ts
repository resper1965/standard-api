/**
 * @module @aegis/auth/permissions
 * @description Aegis Access Control definitions.
 *
 * Maps Aegis domain resources to granular permissions.
 * Used by Better Auth's organization plugin for RBAC enforcement.
 */

/**
 * Aegis permission resources and their allowed operations.
 * These are checked via `auth.api.hasPermission()` in middleware.
 */
export const AEGIS_PERMISSIONS = {
  assessment: ["read", "create", "update", "delete", "approve", "run_workflow", "cancel"] as const,
  document: ["read", "upload", "delete"] as const,
  kb: ["read", "search"] as const,
  soa: ["read", "create", "approve"] as const,
  gap_analysis: ["read", "create", "approve"] as const,
  maturity: ["read", "create", "approve"] as const,
  poam: ["read", "create", "approve"] as const,
  report: ["read", "generate", "export"] as const,
  agent: ["run", "read"] as const,
  organization: ["read", "update", "manage_members"] as const,
  admin: ["manage_users", "manage_orgs", "impersonate"] as const,
} as const;

export type AegisResource = keyof typeof AEGIS_PERMISSIONS;
export type AegisPermission<R extends AegisResource = AegisResource> =
  `${R}:${(typeof AEGIS_PERMISSIONS)[R][number]}`;

/**
 * Role-permission mapping for the Aegis platform.
 * Better Auth uses these to enforce access control via organization plugin.
 */
export const AEGIS_ROLE_PERMISSIONS = {
  owner: {
    assessment: ["read", "create", "update", "delete", "approve", "run_workflow", "cancel"],
    document: ["read", "upload", "delete"],
    kb: ["read", "search"],
    soa: ["read", "create", "approve"],
    gap_analysis: ["read", "create", "approve"],
    maturity: ["read", "create", "approve"],
    poam: ["read", "create", "approve"],
    report: ["read", "generate", "export"],
    agent: ["run", "read"],
    organization: ["read", "update", "manage_members"],
    admin: ["manage_users", "manage_orgs", "impersonate"],
  },
  admin: {
    assessment: ["read", "create", "update", "approve", "run_workflow", "cancel"],
    document: ["read", "upload", "delete"],
    kb: ["read", "search"],
    soa: ["read", "create", "approve"],
    gap_analysis: ["read", "create", "approve"],
    maturity: ["read", "create", "approve"],
    poam: ["read", "create", "approve"],
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

export type AegisRole = keyof typeof AEGIS_ROLE_PERMISSIONS;

/**
 * Check if a role has a specific permission.
 */
export const roleHasPermission = (
  role: AegisRole,
  resource: AegisResource,
  action: string
): boolean => {
  const perms = AEGIS_ROLE_PERMISSIONS[role];
  if (!perms) return false;
  const resourcePerms = perms[resource as keyof typeof perms] as readonly string[] | undefined;
  if (!resourcePerms) return false;
  return resourcePerms.includes(action);
};
