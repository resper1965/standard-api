/**
 * Unit tests for @aegis/email template renderers.
 * Validates: non-empty subjects, HTML contains payload data, text fallback exists.
 */

import { test, expect } from "./test-kit";
import {
  renderWelcomeEmail,
  renderVerificationEmail,
  renderApprovalRequestEmail,
  renderStateChangeEmail,
  renderReportReadyEmail,
  renderSecurityAlertEmail,
  renderEmail,
} from "../src/templates";
import type {
  WelcomeEmailPayload,
  VerificationEmailPayload,
  ApprovalRequestEmailPayload,
  StateChangeEmailPayload,
  ReportReadyEmailPayload,
  SecurityAlertEmailPayload,
} from "../src/types";

// ─── Fixtures ───────────────────────────────────────────────────

const welcomePayload: WelcomeEmailPayload = {
  type: "welcome",
  to: "alice@example.com",
  firstName: "Alice",
  dashboardUrl: "https://apiaegis.bekaa.eu/dashboard",
};

const verificationPayload: VerificationEmailPayload = {
  type: "verification",
  to: "bob@example.com",
  firstName: "Bob",
  verificationUrl: "https://apiaegis.bekaa.eu/verify?token=abc123",
  expiresIn: "1 hour",
};

const approvalPayload: ApprovalRequestEmailPayload = {
  type: "approval_request",
  to: "reviewer@example.com",
  artifactName: "Statement of Applicability v1",
  assessmentName: "ISO 27001 Assessment",
  organizationName: "Acme Corp",
  reviewUrl: "https://apiaegis.bekaa.eu/assessments/123/soa",
  submittedBy: "admin@acme.com",
};

const stateChangePayload: StateChangeEmailPayload = {
  type: "state_change",
  to: "user@example.com",
  assessmentName: "SOC2 Assessment",
  organizationName: "Beta Inc",
  previousState: "soa_drafted",
  newState: "soa_under_review",
  assessmentUrl: "https://apiaegis.bekaa.eu/assessments/456",
};

const reportReadyPayload: ReportReadyEmailPayload = {
  type: "report_ready",
  to: "ciso@example.com",
  assessmentName: "PCI DSS Assessment",
  organizationName: "Gamma LLC",
  reportType: "Gap Analysis Report",
  downloadUrl: "https://apiaegis.bekaa.eu/reports/789/download",
};

const securityAlertPayload: SecurityAlertEmailPayload = {
  type: "security_alert",
  to: "admin@example.com",
  alertTitle: "Brute Force Detected",
  description: "Multiple failed login attempts from a single IP.",
  timestamp: "2026-05-04T10:00:00Z",
  ipAddress: "192.168.1.100",
  auditUrl: "https://apiaegis.bekaa.eu/admin/audit",
};

// ─── Tests ──────────────────────────────────────────────────────

test("renderWelcomeEmail: subject contains firstName", () => {
  const result = renderWelcomeEmail(welcomePayload);
  expect(result.subject).toContain("Alice");
  expect(result.html).toContain("Alice");
  expect(result.html).toContain(welcomePayload.dashboardUrl);
  expect(result.text).toContain("Alice");
  expect(result.text).toContain(welcomePayload.dashboardUrl);
});

test("renderVerificationEmail: contains verification URL", () => {
  const result = renderVerificationEmail(verificationPayload);
  expect(result.subject).toContain("Verify");
  expect(result.html).toContain(verificationPayload.verificationUrl);
  expect(result.html).toContain("1 hour");
  expect(result.text).toContain(verificationPayload.verificationUrl);
});

test("renderApprovalRequestEmail: contains artifact and assessment names", () => {
  const result = renderApprovalRequestEmail(approvalPayload);
  expect(result.subject).toContain("Statement of Applicability v1");
  expect(result.html).toContain("Statement of Applicability v1");
  expect(result.html).toContain("ISO 27001 Assessment");
  expect(result.html).toContain("Acme Corp");
  expect(result.html).toContain(approvalPayload.reviewUrl);
  expect(result.text).toContain("admin@acme.com");
});

test("renderStateChangeEmail: contains states", () => {
  const result = renderStateChangeEmail(stateChangePayload);
  expect(result.subject).toContain("soa_under_review");
  expect(result.html).toContain("soa_drafted");
  expect(result.html).toContain("soa_under_review");
  expect(result.text).toContain("soa_drafted");
});

test("renderReportReadyEmail: contains report type and download URL", () => {
  const result = renderReportReadyEmail(reportReadyPayload);
  expect(result.subject).toContain("Gap Analysis Report");
  expect(result.html).toContain(reportReadyPayload.downloadUrl);
  expect(result.text).toContain(reportReadyPayload.downloadUrl);
});

test("renderSecurityAlertEmail: contains alert title and IP", () => {
  const result = renderSecurityAlertEmail(securityAlertPayload);
  expect(result.subject).toContain("Brute Force Detected");
  expect(result.html).toContain("192.168.1.100");
  expect(result.html).toContain(securityAlertPayload.auditUrl);
  expect(result.text).toContain("Brute Force Detected");
});

test("renderEmail: correctly routes all 6 types", () => {
  const payloads = [
    welcomePayload,
    verificationPayload,
    approvalPayload,
    stateChangePayload,
    reportReadyPayload,
    securityAlertPayload,
  ];

  for (const payload of payloads) {
    const result = renderEmail(payload);
    expect(result.subject).toBeTruthy();
    expect(result.html).toContain("Aegis");
    expect(result.text).toBeTruthy();
  }
});

test("all templates include HTML doctype and plain text fallback", () => {
  const payloads = [
    welcomePayload,
    verificationPayload,
    approvalPayload,
    stateChangePayload,
    reportReadyPayload,
    securityAlertPayload,
  ];

  for (const payload of payloads) {
    const result = renderEmail(payload);
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.text.length).toBeGreaterThan(10);
  }
});
