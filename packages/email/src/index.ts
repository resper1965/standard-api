/**
 * @module @aegis/email
 *
 * Aegis transactional email package.
 * Uses Cloudflare Email Service Workers binding for native email sending.
 *
 * Usage:
 * ```ts
 * import { sendAegisEmail } from "@aegis/email";
 *
 * const result = await sendAegisEmail(env.EMAIL, {
 *   type: "welcome",
 *   to: "user@example.com",
 *   firstName: "Alice",
 *   dashboardUrl: "https://apiaegis.bekaa.eu/dashboard"
 * }, { domain: "bekaa.eu" });
 * ```
 */

// Types
export type {
  SendEmail,
  EmailMessageBuilder,
  EmailAttachment,
  EmailSendResult,
  CloudflareEmailErrorCode,
  AegisEmailType,
  AegisEmailBase,
  WelcomeEmailPayload,
  VerificationEmailPayload,
  ApprovalRequestEmailPayload,
  StateChangeEmailPayload,
  ReportReadyEmailPayload,
  SecurityAlertEmailPayload,
  AegisEmailPayload,
  AegisEmailResult,
  AegisEmailOptions,
} from "./types";

export { AegisEmailError } from "./types";

// Templates
export {
  renderWelcomeEmail,
  renderVerificationEmail,
  renderApprovalRequestEmail,
  renderStateChangeEmail,
  renderReportReadyEmail,
  renderSecurityAlertEmail,
  renderEmail,
} from "./templates";

export type { RenderedEmail } from "./templates";

// Send
export { sendAegisEmail, describeEmailError } from "./send";
