/**
 * @module @aegis/email - Send
 *
 * Typed wrapper around the Cloudflare Email Service binding.
 * Abstracts the CF binding so the rest of the platform uses
 * `sendAegisEmail(binding, payload, options)` without knowing CF details.
 */

import { renderEmail } from "./templates";
import type {
  SendEmail,
  AegisEmailPayload,
  AegisEmailOptions,
  AegisEmailResult,
  CloudflareEmailErrorCode,
} from "./types";
import { AegisEmailError } from "./types";

/**
 * Send a typed Aegis transactional email via the Cloudflare Email Service binding.
 *
 * @param binding - The `env.EMAIL` SendEmail binding from Cloudflare Workers
 * @param payload - Discriminated union payload (type determines template)
 * @param options - Sender domain and optional overrides
 * @returns Result with messageId and metadata
 * @throws AegisEmailError with Cloudflare error code on failure
 *
 * @example
 * ```ts
 * const result = await sendAegisEmail(env.EMAIL, {
 *   type: "welcome",
 *   to: "user@example.com",
 *   firstName: "Alice",
 *   dashboardUrl: "https://apiaegis.bekaa.eu/dashboard"
 * }, { domain: "bekaa.eu" });
 *
 * console.log(result.messageId); // "msg_abc123..."
 * ```
 */
export async function sendAegisEmail(
  binding: SendEmail,
  payload: AegisEmailPayload,
  options: AegisEmailOptions
): Promise<AegisEmailResult> {
  // 1. Render the template
  const rendered = renderEmail(payload);

  // 2. Build sender address
  const fromEmail = options.from ?? `noreply@${options.domain}`;
  const fromName = options.fromName ?? "Aegis Platform";

  // 3. Send via Cloudflare binding
  try {
    const result = await binding.send({
      to: payload.to,
      from: { email: fromEmail, name: fromName },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return {
      success: true,
      messageId: result.messageId,
      type: payload.type,
      to: payload.to,
      sentAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    // Extract Cloudflare error code if available
    const code = extractErrorCode(error);
    const message = error instanceof Error ? error.message : String(error);

    throw new AegisEmailError(
      code,
      `Failed to send ${payload.type} email to ${payload.to}: ${message}`,
      payload.type,
      payload.to
    );
  }
}

/**
 * Extract the Cloudflare error code from an email send error.
 * CF errors have a `.code` property on the Error object.
 */
function extractErrorCode(error: unknown): CloudflareEmailErrorCode | "UNKNOWN" {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    // Validate it's a known CF error code
    if (code.startsWith("E_")) {
      return code as CloudflareEmailErrorCode;
    }
  }
  return "UNKNOWN";
}

/** Human-readable error message for common CF email error codes */
export function describeEmailError(code: CloudflareEmailErrorCode | "UNKNOWN"): string {
  switch (code) {
    case "E_SENDER_NOT_VERIFIED":
      return "The sender domain has not been verified. Configure SPF/DKIM in Cloudflare.";
    case "E_SENDER_DOMAIN_NOT_AVAILABLE":
      return "The sender domain is not available for email sending.";
    case "E_RECIPIENT_NOT_ALLOWED":
      return "The recipient address is not in the allowed destination list.";
    case "E_RECIPIENT_SUPPRESSED":
      return "The recipient has been suppressed (previous bounce or complaint).";
    case "E_RATE_LIMIT_EXCEEDED":
      return "Email sending rate limit exceeded. Try again shortly.";
    case "E_DAILY_LIMIT_EXCEEDED":
      return "Daily email sending quota exhausted. Resets after 24 hours.";
    case "E_TOO_MANY_RECIPIENTS":
      return "Too many recipients. Maximum 50 per email.";
    case "E_CONTENT_TOO_LARGE":
      return "Email content exceeds the size limit (5 MiB / 25 MiB for verified).";
    case "E_DELIVERY_FAILED":
      return "Email delivery failed. The recipient mail server rejected the message.";
    case "E_VALIDATION_ERROR":
      return "Invalid email message structure.";
    case "E_FIELD_MISSING":
      return "A required field (to, from, or subject) is missing.";
    case "E_INTERNAL_SERVER_ERROR":
      return "Internal error in the Cloudflare Email Service. Retry later.";
    default:
      return "An unexpected error occurred while sending the email.";
  }
}
