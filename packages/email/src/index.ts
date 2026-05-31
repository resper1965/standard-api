/**
 * @module @standard/email
 *
 * Standard transactional email package.
 * Uses Cloudflare Email Service Workers binding for native email sending.
 *
 * Usage:
 * ```ts
 * import { sendStandardEmail } from "@standard/email";
 *
 * const result = await sendStandardEmail(env.EMAIL, {
 *   type: "welcome",
 *   to: "user@example.com",
 *   firstName: "Alice",
 *   dashboardUrl: "https://apistandard.bekaa.eu/dashboard"
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
  StandardEmailType,
  StandardEmailBase,
  WelcomeEmailPayload,
  VerificationEmailPayload,
  PasswordResetEmailPayload,
  ApprovalRequestEmailPayload,
  StateChangeEmailPayload,
  ReportReadyEmailPayload,
  SecurityAlertEmailPayload,
  StandardEmailPayload,
  StandardEmailResult,
  StandardEmailOptions,
} from "./types";

export { StandardEmailError } from "./types";

// Templates
export {
  renderWelcomeEmail,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderApprovalRequestEmail,
  renderStateChangeEmail,
  renderReportReadyEmail,
  renderSecurityAlertEmail,
  renderEmail,
} from "./templates";

export type { RenderedEmail } from "./templates";

// Send
export { sendStandardEmail, describeEmailError } from "./send";

