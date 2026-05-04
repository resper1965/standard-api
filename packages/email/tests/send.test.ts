/**
 * Unit tests for @aegis/email send wrapper.
 * Uses a mock SendEmail binding to test sendAegisEmail behavior.
 */

import { test, expect } from "./test-kit";
import { sendAegisEmail, describeEmailError } from "../src/send";
import { AegisEmailError } from "../src/types";
import type { SendEmail, EmailMessageBuilder, AegisEmailPayload } from "../src/types";

// ─── Mock Binding ───────────────────────────────────────────────

function createMockBinding(opts: {
  messageId?: string;
  throwError?: { code?: string; message: string };
} = {}): SendEmail & { calls: EmailMessageBuilder[] } {
  const calls: EmailMessageBuilder[] = [];
  return {
    calls,
    async send(message: EmailMessageBuilder) {
      calls.push(message);
      if (opts.throwError) {
        const error = new Error(opts.throwError.message) as Error & { code?: string };
        if (opts.throwError.code) error.code = opts.throwError.code;
        throw error;
      }
      return { messageId: opts.messageId ?? "msg_test_123" };
    },
  };
}

const testPayload: AegisEmailPayload = {
  type: "welcome",
  to: "test@example.com",
  firstName: "TestUser",
  dashboardUrl: "https://apiaegis.bekaa.eu/dashboard",
};

// ─── Tests ──────────────────────────────────────────────────────

test("sendAegisEmail: returns success with messageId", async () => {
  const binding = createMockBinding({ messageId: "msg_abc_456" });

  const result = await sendAegisEmail(binding, testPayload, { domain: "bekaa.eu" });

  expect(result.success).toBe(true);
  expect(result.messageId).toBe("msg_abc_456");
  expect(result.type).toBe("welcome");
  expect(result.to).toBe("test@example.com");
  expect(result.sentAt).toBeTruthy();
});

test("sendAegisEmail: builds correct from address", async () => {
  const binding = createMockBinding();

  await sendAegisEmail(binding, testPayload, { domain: "bekaa.eu" });

  const sent = binding.calls[0]!;
  const from = sent.from as { email: string; name: string };
  expect(from.email).toBe("noreply@bekaa.eu");
  expect(from.name).toBe("Aegis Platform");
});

test("sendAegisEmail: supports custom from address", async () => {
  const binding = createMockBinding();

  await sendAegisEmail(binding, testPayload, {
    domain: "bekaa.eu",
    from: "custom@bekaa.eu",
    fromName: "Custom Sender",
  });

  const sent = binding.calls[0]!;
  const from = sent.from as { email: string; name: string };
  expect(from.email).toBe("custom@bekaa.eu");
  expect(from.name).toBe("Custom Sender");
});

test("sendAegisEmail: includes subject and HTML from template", async () => {
  const binding = createMockBinding();

  await sendAegisEmail(binding, testPayload, { domain: "bekaa.eu" });

  const sent = binding.calls[0]!;
  expect(sent.subject).toContain("TestUser");
  expect(sent.html!).toContain("TestUser");
  expect(sent.text!).toContain("TestUser");
});

test("sendAegisEmail: throws AegisEmailError on CF error", async () => {
  const binding = createMockBinding({
    throwError: { code: "E_SENDER_NOT_VERIFIED", message: "Domain not verified" },
  });

  let caught: AegisEmailError | null = null;
  try {
    await sendAegisEmail(binding, testPayload, { domain: "bekaa.eu" });
  } catch (err) {
    if (err instanceof AegisEmailError) caught = err;
  }

  expect(caught).toBeDefined();
  expect(caught!.code).toBe("E_SENDER_NOT_VERIFIED");
  expect(caught!.type).toBe("welcome");
  expect(caught!.to).toBe("test@example.com");
});

test("sendAegisEmail: uses UNKNOWN code for non-CF errors", async () => {
  const binding = createMockBinding({
    throwError: { message: "Network failure" },
  });

  let caught: AegisEmailError | null = null;
  try {
    await sendAegisEmail(binding, testPayload, { domain: "bekaa.eu" });
  } catch (err) {
    if (err instanceof AegisEmailError) caught = err;
  }

  expect(caught).toBeDefined();
  expect(caught!.code).toBe("UNKNOWN");
});

test("sendAegisEmail: works for all 6 email types", async () => {
  const binding = createMockBinding();

  const payloads: AegisEmailPayload[] = [
    { type: "welcome", to: "a@test.com", firstName: "A", dashboardUrl: "https://x.com" },
    { type: "verification", to: "b@test.com", firstName: "B", verificationUrl: "https://x.com/v", expiresIn: "30 min" },
    { type: "approval_request", to: "c@test.com", artifactName: "SoA", assessmentName: "ISO", organizationName: "Org", reviewUrl: "https://x.com/r", submittedBy: "u@x.com" },
    { type: "state_change", to: "d@test.com", assessmentName: "ISO", organizationName: "Org", previousState: "draft", newState: "active", assessmentUrl: "https://x.com/a" },
    { type: "report_ready", to: "e@test.com", assessmentName: "ISO", organizationName: "Org", reportType: "Gap", downloadUrl: "https://x.com/d" },
    { type: "security_alert", to: "f@test.com", alertTitle: "Alert", description: "Desc", timestamp: "2026-01-01", auditUrl: "https://x.com/l" },
  ];

  for (const payload of payloads) {
    const result = await sendAegisEmail(binding, payload, { domain: "test.com" });
    expect(result.success).toBe(true);
    expect(result.type).toBe(payload.type);
  }

  expect(binding.calls.length).toBe(6);
});

test("describeEmailError: returns human-readable messages", () => {
  expect(describeEmailError("E_SENDER_NOT_VERIFIED")).toContain("verified");
  expect(describeEmailError("E_RATE_LIMIT_EXCEEDED")).toContain("rate limit");
  expect(describeEmailError("E_DAILY_LIMIT_EXCEEDED")).toContain("quota");
  expect(describeEmailError("UNKNOWN")).toContain("unexpected");
});
