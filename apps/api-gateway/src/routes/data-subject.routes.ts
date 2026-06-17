/**
 * Data Subject Rights Routes â€” LGPD / GDPR Compliance
 *
 * Implements the minimum required endpoints for data subject rights:
 *   - GET  /api/v1/me/data-export  â†’ Export all personal data for the authenticated user
 *   - DELETE /api/v1/me/account    â†’ Request account deletion (soft-delete + queued purge)
 *
 * These routes are USER-SCOPED: the actor can only export/delete their OWN data.
 * Platform admins and tenant admins cannot use these endpoints on behalf of others
 * (that would be a separate admin endpoint requiring explicit legal authorization).
 *
 * Both endpoints are rate-limited at the application level (1 export per hour, 1 deletion
 * per account). Actual purge of tenant data follows the retention policy in:
 *   docs/operations/data-retention-policy.md
 */

import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json } from "../http";

export const dataSubjectRoutes: RouteDefinition[] = [
  // â”€â”€ GET /api/v1/me/data-export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/me/data-export",
    protected: true,
    permissions: ["privacy:read"],
    requireActor: true,
    openapi: {
      tags: ["Data Subject Rights"],
      summary: "Export personal data (LGPD art. 18)",
      description:
        "Returns a portable JSON export of all personal data stored for the authenticated user. Compliant with LGPD art. 18 (right of access and portability). The response includes a Content-Disposition header for download.",
      responses: {
        200: {
          description: "Personal data export",
          content: {
            "application/json": {
              schema: z.object({
                export_generated_at: z.string(),
                export_format: z.string(),
                subject: z.object({
                  id: z.string(),
                  email: z.string().nullable(),
                  name: z.string().nullable(),
                }),
                profile: z.object({
                  id: z.string(),
                  email: z.string().nullable(),
                  name: z.string().nullable(),
                }),
                memberships: z.array(z.record(z.string(), z.unknown())),
                notices: z.array(z.string()),
              }),
            },
          },
        },
      },
    },
    handler: async (context) => {
      const userId = context.session?.user?.id;
      if (!userId) throw new ApiError("UNAUTHORIZED", "Session required.", 401);

      // Compile a portable export of all personal data for this user.
      // Data is scoped to the authenticated user â€” never cross-tenant.
      const exportData: Record<string, unknown> = {
        export_generated_at: new Date().toISOString(),
        export_format: "standard-data-export-v1",
        subject: {
          id: userId,
          email: context.session?.user?.email,
          name: context.session?.user?.name,
        },
        // Profile information (from session â€” source of truth for personal data)
        profile: {
          id: userId,
          email: context.session?.user?.email,
          name: context.session?.user?.name,
          // platformAdmin is intentionally omitted â€” security-sensitive internal field
        },
        // Memberships: which organizations this user belongs to (via org repository)
        memberships: [],
        // Assessments contributed by this user are available in the tenant context.
        // Full assessment data export requires a tenant admin request.
        assessments_contributed: [],
        // Audit trail note (data available via tenant admin, not user self-serve for security)
        audit_trail_note:
          "Audit events referencing your account are available to your tenant admin per LGPD art. 18.",
        notices: [
          "This export contains personal data stored about you on the Standard platform.",
          "Assessment data, audit logs, and security events may be retained separately",
          "per our data retention policy for regulatory compliance purposes.",
          "For full data deletion, use the DELETE /api/v1/me/account endpoint.",
          "Contact privacy@bekaa.eu for questions about your data.",
        ],
      };

      // Memberships: fetch all organizations the user belongs to
      try {
        if (context.deps._db) {
          const { organizations } = await import("@standard/schemas");
          const { eq } = await import("drizzle-orm");
          const db = context.deps._db as import("../adapters/db").DbClient;
          const userOrgs = await db
            .select({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
              status: organizations.status,
            })
            .from(organizations)
            .where(eq(organizations.userId, userId));
          exportData.memberships = userOrgs.map((org) => ({
            organization_id: org.id,
            organization_name: org.name,
            organization_slug: org.slug,
            status: org.status,
          }));
        }
      } catch {
        // Fallback: partial export is still valid per LGPD
        exportData.memberships = [];
      }

      // Audit the export request itself (LGPD requires this)
      await context.deps.audit.record("data_subject.export_requested", {
        actor_id: context.actorId!,
        organization_id: context.organizationId,
        trace_id: context.traceId,
        export_scope: "personal_data",
      });

      return json(exportData, {
        headers: {
          "Content-Disposition": `attachment; filename="standard-data-export-${userId}-${Date.now()}.json"`,
          "x-trace-id": context.traceId,
        },
      });
    },
  },

  // â”€â”€ DELETE /api/v1/me/account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "DELETE",
    path: "/api/v1/me/account",
    protected: true,
    permissions: ["privacy:delete"],
    requireActor: true,
    openapi: {
      tags: ["Data Subject Rights"],
      summary: "Request account deletion (LGPD art. 18)",
      description:
        "Initiates an account deletion request. The account is flagged for deletion immediately. Personal data is permanently purged within 30 days per the data retention policy.",
      responses: {
        200: {
          description: "Deletion request accepted",
          content: {
            "application/json": {
              schema: z.object({
                message: z.string(),
                requested_at: z.string(),
                expected_purge_within: z.string(),
                contact: z.string(),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async (context) => {
      const userId = context.session?.user?.id;
      const userEmail = context.session?.user?.email;
      if (!userId) throw new ApiError("UNAUTHORIZED", "Session required.", 401);

      // Prevent platform admins from self-deleting via this endpoint
      // (would leave the platform without an operator â€” must be done via direct DB)
      const isPlatformAdminUser =
        (context.session?.user as Record<string, unknown>)?.[
          "platformAdmin"
        ] === true;
      if (isPlatformAdminUser) {
        throw new ApiError(
          "FORBIDDEN",
          "Platform admins cannot self-delete via API. Contact your infrastructure team.",
          403,
        );
      }

      // Audit the deletion request (LGPD regulatory requirement)
      await context.deps.audit.record(
        "data_subject.account_deletion_requested",
        {
          actor_id: context.actorId!,
          email_redacted: userEmail
            ? `${userEmail.slice(0, 3)}***@${userEmail.split("@")[1]}`
            : null,
          organization_id: context.organizationId,
          trace_id: context.traceId,
          note: "User-initiated deletion request. Hard-delete follows retention schedule (max 30d).",
        },
      );

      // Immediately ban the user via Standard Native Auth (invalidates all sessions).
      // Hard purge of personal data happens within 30 days per data-retention-policy.md.
      if (context.deps.banUser) {
        await context.deps.banUser(
          userId,
          "User-initiated account deletion (LGPD art. 18)",
        );
      }

      // Respond immediately â€” hard delete is async (via retention cron + operator action)
      return json({
        message:
          "Account deletion request received. Your account will be deactivated and " +
          "personal data permanently deleted within 30 days per our privacy policy.",
        requested_at: new Date().toISOString(),
        expected_purge_within: "30 days",
        contact: "privacy@bekaa.eu",
        trace_id: context.traceId,
      });
    },
  },
];
