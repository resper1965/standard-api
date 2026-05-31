/**
 * @module @standard/email - Types
 *
 * Cloudflare Email Service binding types + Standard email domain types.
 * Ref: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

// ─── Cloudflare Email Service Binding Types ─────────────────────

/** Cloudflare Workers SendEmail binding interface */
export interface SendEmail {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>;
}

/** Structured email message (recommended builder — no mimetext needed) */
export interface EmailMessageBuilder {
  /** Recipient(s) — max 50 combined across to/cc/bcc */
  to: string | string[];
  /** Sender address or object with display name */
  from: string | { email: string; name: string };
  /** Email subject — max 998 chars (RFC 5322) */
  subject: string;
  /** HTML body */
  html?: string;
  /** Plain text fallback */
  text?: string;
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
  /** Reply-To address */
  replyTo?: string | { email: string; name: string };
  /** File attachments */
  attachments?: EmailAttachment[];
  /** Custom headers (max 16KB combined) */
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  /** Base64 string or binary content */
  content: string | ArrayBuffer;
  filename: string;
  /** MIME type (e.g. "application/pdf") */
  type: string;
  disposition: "attachment" | "inline";
  /** For inline attachments referenced via cid: in HTML */
  contentId?: string;
}

export interface EmailSendResult {
  /** Unique email ID assigned by Cloudflare */
  messageId: string;
}

// ─── Cloudflare Email Service Error Codes ───────────────────────

export type CloudflareEmailErrorCode =
  | "E_VALIDATION_ERROR"
  | "E_FIELD_MISSING"
  | "E_TOO_MANY_RECIPIENTS"
  | "E_SENDER_NOT_VERIFIED"
  | "E_RECIPIENT_NOT_ALLOWED"
  | "E_RECIPIENT_SUPPRESSED"
  | "E_SENDER_DOMAIN_NOT_AVAILABLE"
  | "E_CONTENT_TOO_LARGE"
  | "E_DELIVERY_FAILED"
  | "E_RATE_LIMIT_EXCEEDED"
  | "E_DAILY_LIMIT_EXCEEDED"
  | "E_INTERNAL_SERVER_ERROR"
  | "E_HEADER_NOT_ALLOWED"
  | "E_HEADER_USE_API_FIELD"
  | "E_HEADER_VALUE_INVALID"
  | "E_HEADER_VALUE_TOO_LONG"
  | "E_HEADER_NAME_INVALID"
  | "E_HEADERS_TOO_LARGE"
  | "E_HEADERS_TOO_MANY";

// ─── Standard Email Domain Types ───────────────────────────────────

/** All supported Standard transactional email types */
export type StandardEmailType =
  | "welcome"
  | "verification"
  | "password_reset"
  | "approval_request"
  | "state_change"
  | "report_ready"
  | "security_alert";

/** Base fields shared by all email payloads */
export interface StandardEmailBase {
  /** Recipient email address */
  to: string;
  /** Recipient display name (optional) */
  recipientName?: string;
}

/** Welcome email after sign-up */
export interface WelcomeEmailPayload extends StandardEmailBase {
  type: "welcome";
  /** User's first name for personalization */
  firstName: string;
  /** Platform URL for getting started */
  dashboardUrl: string;
}

/** Email verification with secure token */
export interface VerificationEmailPayload extends StandardEmailBase {
  type: "verification";
  firstName: string;
  /** Full verification URL with token embedded */
  verificationUrl: string;
  /** Token expiry duration for display (e.g. "1 hour") */
  expiresIn: string;
}

/** Password reset email with secure token */
export interface PasswordResetEmailPayload extends StandardEmailBase {
  type: "password_reset";
  firstName: string;
  /** Full reset URL with token embedded */
  resetUrl: string;
  /** Token expiry duration for display (e.g. "1 hour") */
  expiresIn: string;
}

/** Approval request notification */
export interface ApprovalRequestEmailPayload extends StandardEmailBase {
  type: "approval_request";
  /** What needs approval (e.g. "Statement of Applicability") */
  artifactName: string;
  /** Assessment name for context */
  assessmentName: string;
  /** Organization name */
  organizationName: string;
  /** URL to review the artifact */
  reviewUrl: string;
  /** Who submitted it */
  submittedBy: string;
}

/** Assessment state change notification */
export interface StateChangeEmailPayload extends StandardEmailBase {
  type: "state_change";
  assessmentName: string;
  organizationName: string;
  /** Previous lifecycle state */
  previousState: string;
  /** New lifecycle state */
  newState: string;
  /** URL to view the assessment */
  assessmentUrl: string;
}

/** Report ready for download */
export interface ReportReadyEmailPayload extends StandardEmailBase {
  type: "report_ready";
  assessmentName: string;
  organizationName: string;
  /** Report type (e.g. "Gap Analysis Report") */
  reportType: string;
  /** URL to download the report */
  downloadUrl: string;
}

/** Security alert for critical actions */
export interface SecurityAlertEmailPayload extends StandardEmailBase {
  type: "security_alert";
  /** Alert title (e.g. "Unauthorized Access Attempt") */
  alertTitle: string;
  /** Description of what happened */
  description: string;
  /** When it happened */
  timestamp: string;
  /** IP address if available */
  ipAddress?: string;
  /** URL to review audit logs */
  auditUrl: string;
}

/** Discriminated union of all Standard email payloads */
export type StandardEmailPayload =
  | WelcomeEmailPayload
  | VerificationEmailPayload
  | PasswordResetEmailPayload
  | ApprovalRequestEmailPayload
  | StateChangeEmailPayload
  | ReportReadyEmailPayload
  | SecurityAlertEmailPayload;

/** Result returned by sendStandardEmail */
export interface StandardEmailResult {
  /** Whether the email was accepted for delivery */
  success: boolean;
  /** Cloudflare-assigned message ID */
  messageId: string;
  /** Which email type was sent */
  type: StandardEmailType;
  /** Recipient address */
  to: string;
  /** ISO timestamp of when the email was sent */
  sentAt: string;
}

/** Options for sendStandardEmail */
export interface StandardEmailOptions {
  /** Sender email address override (default: noreply@{domain}) */
  from?: string;
  /** Sender display name (default: "Standard Platform") */
  fromName?: string;
  /** Domain for the sender address (required) */
  domain: string;
}

/** Email send error with Cloudflare error code */
export class StandardEmailError extends Error {
  constructor(
    public readonly code: CloudflareEmailErrorCode | "UNKNOWN",
    message: string,
    public readonly type: StandardEmailType,
    public readonly to: string
  ) {
    super(message);
    this.name = "StandardEmailError";
  }
}

