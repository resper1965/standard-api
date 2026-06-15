// @ts-nocheck -- Zod v4 CI type compat
/**
 * Dashboard & Summary Schemas
 *
 * Server-computed aggregations exposed via API so frontends
 * never need to calculate compliance percentages or count findings.
 */
import { z } from "zod";

// â”€â”€ Assessment Summary (GET /assessments/:id/summary) â”€â”€â”€â”€â”€â”€â”€

export const AssessmentSummarySchema = z.object({
  assessment_id: z.string().uuid(),
  name: z.string(),
  state: z.string(),

  /** SCF controls in scope */
  total_controls: z.number().int().nonnegative(),
  /** Controls with "implemented" or "operational" status */
  implemented_controls: z.number().int().nonnegative(),
  /** Compliance percentage (0-100) = implemented / total Ã— 100 */
  compliance_pct: z.number().min(0).max(100),

  /** Gap findings */
  total_findings: z.number().int().nonnegative(),
  critical_findings: z.number().int().nonnegative(),
  high_findings: z.number().int().nonnegative(),
  medium_findings: z.number().int().nonnegative(),
  low_findings: z.number().int().nonnegative(),

  /** POA&M open items */
  open_poam_items: z.number().int().nonnegative(),
  /** Average maturity score (1-5 scale, null if no maturity assessment) */
  maturity_avg: z.number().nullable(),

  /** Timestamps */
  last_activity_at: z.string().datetime().nullable(),
  computed_at: z.string().datetime(),
});

export type AssessmentSummary = z.infer<typeof AssessmentSummarySchema>;

// â”€â”€ Organization Dashboard (GET /organizations/:id/dashboard) â”€

export const OrganizationDashboardSchema = z.object({
  organization_id: z.string().uuid(),
  organization_name: z.string(),

  /** Assessment counts */
  total_assessments: z.number().int().nonnegative(),
  assessments_by_state: z.record(z.string(), z.number().int().nonnegative()),

  /** Aggregated KPIs */
  compliance_avg_pct: z.number().min(0).max(100),
  total_open_poams: z.number().int().nonnegative(),
  total_critical_findings: z.number().int().nonnegative(),
  total_high_findings: z.number().int().nonnegative(),

  /** Activity */
  last_activity_at: z.string().datetime().nullable(),
  computed_at: z.string().datetime(),
});

export type OrganizationDashboard = z.infer<typeof OrganizationDashboardSchema>;

// â”€â”€ Audit Log Tenant Query (GET /tenants/:id/audit-logs) â”€â”€â”€â”€â”€

export const AuditLogTenantQuerySchema = z.object({
  action: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  resource_type: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AuditLogTenantQuery = z.infer<typeof AuditLogTenantQuerySchema>;

// â”€â”€ Membership (CRUD for members) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MembershipStatusSchema = z.enum(["invited", "active", "suspended", "removed"]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const MembershipSchema = z.object({
  membership_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  role: z.string(),
  status: MembershipStatusSchema,
  invited_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Membership = z.infer<typeof MembershipSchema>;

export const InviteMemberRequestSchema = z.strictObject({
  email: z.string().email(),
  role: z.string(),
  display_name: z.string().optional(),
});

export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>;

export const UpdateMemberRoleRequestSchema = z.strictObject({
  role: z.string(),
});

export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>;

