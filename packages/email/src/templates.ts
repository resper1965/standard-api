/**
 * @module @aegis/email - Templates
 *
 * Pure functions that render typed payloads into email subject + HTML + text.
 * Templates use inline CSS for maximum email client compatibility.
 *
 * Design: Aegis corporate palette — dark navy (#0f172a), accent blue (#3b82f6),
 * clean typography, minimal layout.
 */

import type {
  WelcomeEmailPayload,
  VerificationEmailPayload,
  ApprovalRequestEmailPayload,
  StateChangeEmailPayload,
  ReportReadyEmailPayload,
  SecurityAlertEmailPayload,
  AegisEmailPayload,
} from "./types";

/** Rendered email content ready for sending */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ─── Layout Primitives ──────────────────────────────────────────

const BRAND = {
  name: "Aegis",
  color: "#3b82f6",
  bgDark: "#0f172a",
  bgLight: "#f8fafc",
  textPrimary: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

const wrapHtml = (title: string, body: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bgLight};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgLight};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND.bgDark};padding:24px 32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🛡️ ${BRAND.name}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:${BRAND.textPrimary};font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;font-size:12px;color:${BRAND.textMuted};border-top:1px solid ${BRAND.border};">
              Sent by Aegis Platform · This is an automated notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const btn = (url: string, label: string, color: string = BRAND.color): string =>
  `<a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0;">${label}</a>`;

const heading = (text: string): string =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">${text}</h1>`;

const paragraph = (text: string): string =>
  `<p style="margin:0 0 12px;color:${BRAND.textPrimary};">${text}</p>`;

const muted = (text: string): string =>
  `<p style="margin:0 0 8px;color:${BRAND.textMuted};font-size:13px;">${text}</p>`;

const divider = (): string =>
  `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:20px 0;" />`;

const infoRow = (label: string, value: string): string =>
  `<tr><td style="padding:6px 12px;font-size:13px;color:${BRAND.textMuted};font-weight:600;">${label}</td><td style="padding:6px 12px;font-size:13px;color:${BRAND.textPrimary};">${value}</td></tr>`;

const infoTable = (rows: Array<[string, string]>): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="background:${BRAND.bgLight};border-radius:8px;width:100%;margin:16px 0;">${rows.map(([l, v]) => infoRow(l, v)).join("")}</table>`;

// ─── Template Renderers ─────────────────────────────────────────

export function renderWelcomeEmail(payload: WelcomeEmailPayload): RenderedEmail {
  const subject = `Welcome to Aegis, ${payload.firstName}!`;

  const html = wrapHtml(
    subject,
    [
      heading(`Welcome, ${payload.firstName}! 👋`),
      paragraph("Your Aegis account is ready. You now have access to the most comprehensive security assessment platform, powered by the Secure Controls Framework."),
      paragraph("Get started by exploring your dashboard — create your first assessment, upload documents, and let our AI-assisted analysis guide your compliance journey."),
      `<div style="text-align:center;">${btn(payload.dashboardUrl, "Open Dashboard")}</div>`,
      divider(),
      muted("If you did not create this account, you can safely ignore this email."),
    ].join("")
  );

  const text = [
    `Welcome, ${payload.firstName}!`,
    "",
    "Your Aegis account is ready. You now have access to the most comprehensive security assessment platform.",
    "",
    `Open your dashboard: ${payload.dashboardUrl}`,
    "",
    "If you did not create this account, you can safely ignore this email.",
    "",
    "— Aegis Platform",
  ].join("\n");

  return { subject, html, text };
}

export function renderVerificationEmail(payload: VerificationEmailPayload): RenderedEmail {
  const subject = "Verify your email — Aegis";

  const html = wrapHtml(
    subject,
    [
      heading("Verify Your Email"),
      paragraph(`Hi ${payload.firstName}, please verify your email address to activate your Aegis account.`),
      `<div style="text-align:center;">${btn(payload.verificationUrl, "Verify Email", BRAND.success)}</div>`,
      divider(),
      muted(`This link expires in ${payload.expiresIn}. If you did not request this, ignore this email.`),
      muted("If the button doesn't work, copy and paste this URL into your browser:"),
      `<p style="word-break:break-all;font-size:12px;color:${BRAND.color};">${payload.verificationUrl}</p>`,
    ].join("")
  );

  const text = [
    `Hi ${payload.firstName},`,
    "",
    "Please verify your email address to activate your Aegis account.",
    "",
    `Verify: ${payload.verificationUrl}`,
    "",
    `This link expires in ${payload.expiresIn}.`,
    "",
    "— Aegis Platform",
  ].join("\n");

  return { subject, html, text };
}

export function renderApprovalRequestEmail(payload: ApprovalRequestEmailPayload): RenderedEmail {
  const subject = `Approval Required: ${payload.artifactName} — ${payload.assessmentName}`;

  const html = wrapHtml(
    subject,
    [
      heading("Approval Required"),
      paragraph(`A new artifact requires your review and approval for <strong>${payload.assessmentName}</strong>.`),
      infoTable([
        ["Artifact", payload.artifactName],
        ["Assessment", payload.assessmentName],
        ["Organization", payload.organizationName],
        ["Submitted by", payload.submittedBy],
      ]),
      `<div style="text-align:center;">${btn(payload.reviewUrl, "Review & Approve", BRAND.warning)}</div>`,
      divider(),
      muted("You are receiving this because you are an approver for this assessment. Do not forward this email."),
    ].join("")
  );

  const text = [
    "Approval Required",
    "",
    `Artifact: ${payload.artifactName}`,
    `Assessment: ${payload.assessmentName}`,
    `Organization: ${payload.organizationName}`,
    `Submitted by: ${payload.submittedBy}`,
    "",
    `Review: ${payload.reviewUrl}`,
    "",
    "— Aegis Platform",
  ].join("\n");

  return { subject, html, text };
}

export function renderStateChangeEmail(payload: StateChangeEmailPayload): RenderedEmail {
  const subject = `Assessment Update: ${payload.assessmentName} → ${payload.newState}`;

  const html = wrapHtml(
    subject,
    [
      heading("Assessment Status Update"),
      paragraph(`The assessment <strong>${payload.assessmentName}</strong> has transitioned to a new state.`),
      infoTable([
        ["Assessment", payload.assessmentName],
        ["Organization", payload.organizationName],
        ["Previous State", payload.previousState],
        ["New State", payload.newState],
      ]),
      `<div style="text-align:center;">${btn(payload.assessmentUrl, "View Assessment")}</div>`,
    ].join("")
  );

  const text = [
    "Assessment Status Update",
    "",
    `Assessment: ${payload.assessmentName}`,
    `Organization: ${payload.organizationName}`,
    `State: ${payload.previousState} → ${payload.newState}`,
    "",
    `View: ${payload.assessmentUrl}`,
    "",
    "— Aegis Platform",
  ].join("\n");

  return { subject, html, text };
}

export function renderReportReadyEmail(payload: ReportReadyEmailPayload): RenderedEmail {
  const subject = `Report Ready: ${payload.reportType} — ${payload.assessmentName}`;

  const html = wrapHtml(
    subject,
    [
      heading("📄 Report Ready"),
      paragraph(`Your <strong>${payload.reportType}</strong> for <strong>${payload.assessmentName}</strong> is ready for download.`),
      infoTable([
        ["Report Type", payload.reportType],
        ["Assessment", payload.assessmentName],
        ["Organization", payload.organizationName],
      ]),
      `<div style="text-align:center;">${btn(payload.downloadUrl, "Download Report", BRAND.success)}</div>`,
      divider(),
      muted("Reports contain sensitive assessment data. Ensure proper handling according to your organization's policies."),
    ].join("")
  );

  const text = [
    "Report Ready",
    "",
    `Report: ${payload.reportType}`,
    `Assessment: ${payload.assessmentName}`,
    `Organization: ${payload.organizationName}`,
    "",
    `Download: ${payload.downloadUrl}`,
    "",
    "— Aegis Platform",
  ].join("\n");

  return { subject, html, text };
}

export function renderSecurityAlertEmail(payload: SecurityAlertEmailPayload): RenderedEmail {
  const subject = `🚨 Security Alert: ${payload.alertTitle}`;

  const rows: Array<[string, string]> = [
    ["Alert", payload.alertTitle],
    ["Time", payload.timestamp],
  ];
  if (payload.ipAddress) {
    rows.push(["IP Address", payload.ipAddress]);
  }

  const html = wrapHtml(
    subject,
    [
      heading("🚨 Security Alert"),
      `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:0 0 16px;">`,
      `<p style="margin:0;color:${BRAND.danger};font-weight:600;">${payload.alertTitle}</p>`,
      `<p style="margin:8px 0 0;color:${BRAND.textPrimary};font-size:14px;">${payload.description}</p>`,
      `</div>`,
      infoTable(rows),
      `<div style="text-align:center;">${btn(payload.auditUrl, "Review Audit Logs", BRAND.danger)}</div>`,
      divider(),
      muted("This is an automated security notification. If you believe this is a false alarm, review the audit logs for details."),
    ].join("")
  );

  const text = [
    `SECURITY ALERT: ${payload.alertTitle}`,
    "",
    payload.description,
    "",
    `Time: ${payload.timestamp}`,
    payload.ipAddress ? `IP: ${payload.ipAddress}` : "",
    "",
    `Audit Logs: ${payload.auditUrl}`,
    "",
    "— Aegis Platform",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// ─── Template Router ────────────────────────────────────────────

/** Render the correct email template based on payload type */
export function renderEmail(payload: AegisEmailPayload): RenderedEmail {
  switch (payload.type) {
    case "welcome":
      return renderWelcomeEmail(payload);
    case "verification":
      return renderVerificationEmail(payload);
    case "approval_request":
      return renderApprovalRequestEmail(payload);
    case "state_change":
      return renderStateChangeEmail(payload);
    case "report_ready":
      return renderReportReadyEmail(payload);
    case "security_alert":
      return renderSecurityAlertEmail(payload);
    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unknown email type: ${((_exhaustive) as AegisEmailPayload).type}`);
    }
  }
}
