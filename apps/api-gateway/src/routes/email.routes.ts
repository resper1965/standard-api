/**
 * Email routes — administrative endpoint for testing email delivery.
 *
 * POST /api/v1/email/test — Send a test email (admin only)
 *
 * @module
 */

import type { RouteDefinition } from "../http";
import { json, parseJson } from "../http";
import { ApiError } from "../errors/api-error";
import { sendStandardEmail, describeEmailError, StandardEmailError } from "@standard/email";
import type { StandardEmailType, StandardEmailPayload } from "@standard/email";
import { z } from "zod";

const EMAIL_DOMAIN = "bekaa.eu";

const testEmailSchema = z.object({
  to: z.string().email("Invalid recipient email address"),
  type: z.enum([
    "welcome",
    "verification",
    "password_reset",
    "approval_request",
    "state_change",
    "report_ready",
    "security_alert",
  ] as const),
});

/** Build a sample payload for testing based on email type */
function buildTestPayload(to: string, type: StandardEmailType): StandardEmailPayload {
  const baseUrl = "https://apistandard.bekaa.eu";

  switch (type) {
    case "welcome":
      return {
        type: "welcome",
        to,
        firstName: "Test User",
        dashboardUrl: `${baseUrl}/dashboard`,
      };
    case "verification":
      return {
        type: "verification",
        to,
        firstName: "Test User",
        verificationUrl: `${baseUrl}/verify?token=test-token-${Date.now()}`,
        expiresIn: "1 hour",
      };
    case "approval_request":
      return {
        type: "approval_request",
        to,
        artifactName: "Statement of Applicability v1",
        assessmentName: "ISO 27001 Assessment (Test)",
        organizationName: "Standard Test Organization",
        reviewUrl: `${baseUrl}/assessments/test/soa`,
        submittedBy: "admin@bekaa.eu",
      };
    case "state_change":
      return {
        type: "state_change",
        to,
        assessmentName: "ISO 27001 Assessment (Test)",
        organizationName: "Standard Test Organization",
        previousState: "soa_drafted",
        newState: "soa_under_review",
        assessmentUrl: `${baseUrl}/assessments/test`,
      };
    case "report_ready":
      return {
        type: "report_ready",
        to,
        assessmentName: "ISO 27001 Assessment (Test)",
        organizationName: "Standard Test Organization",
        reportType: "Gap Analysis Report",
        downloadUrl: `${baseUrl}/reports/test/download`,
      };
    case "security_alert":
      return {
        type: "security_alert",
        to,
        alertTitle: "Test Security Alert",
        description: "This is a test alert sent via the /api/v1/email/test endpoint.",
        timestamp: new Date().toISOString(),
        ipAddress: "127.0.0.1",
        auditUrl: `${baseUrl}/admin/audit`,
      };
    case "password_reset":
      return {
        type: "password_reset",
        to,
        firstName: "Test User",
        resetUrl: `${baseUrl}/auth/reset-password?token=test-token-${Date.now()}`,
        expiresIn: "1 hour",
      };
    default: {
      const _exhaustive: never = type;
      throw new ApiError("VALIDATION_ERROR", `Unknown email type: ${String(_exhaustive)}`, 400);
    }
  }
}

export const emailRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/email/test",
    protected: true,
    requireActor: true,
    permissions: ["admin:write"],
    handler: async (ctx) => {
      const body = await parseJson(ctx.request, testEmailSchema);
      const { to, type } = body;

      // Check email binding availability
      if (!ctx.deps.email) {
        throw new ApiError(
          "EMAIL_SERVICE_UNAVAILABLE",
          "Email service binding is not configured. Ensure the send_email binding is present in wrangler.toml.",
          503
        );
      }

      const payload = buildTestPayload(to, type);

      try {
        const result = await sendStandardEmail(ctx.deps.email, payload, {
          domain: EMAIL_DOMAIN,
        });

        return json({
          success: true,
          data: {
            messageId: result.messageId,
            type: result.type,
            to: result.to,
            sentAt: result.sentAt,
          },
          trace_id: ctx.traceId,
        });
      } catch (error) {
        if (error instanceof StandardEmailError) {
          throw new ApiError(
            "EMAIL_SEND_FAILED",
            `${describeEmailError(error.code)} (${error.code})`,
            error.code === "E_RATE_LIMIT_EXCEEDED" || error.code === "E_DAILY_LIMIT_EXCEEDED"
              ? 429
              : 502
          );
        }
        throw error;
      }
    },
  },
];

