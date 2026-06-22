import { describe, it, expect } from "vitest";
import { WEBHOOK_EVENT_TYPES, WebhookEventTypeSchema } from "../webhooks";

describe("WEBHOOK_EVENT_TYPES — TPRA mandatory events", () => {
  it("deve incluir tpra.assessment.completed", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("tpra.assessment.completed");
  });

  it("deve incluir vendor.risk_score.updated", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("vendor.risk_score.updated");
  });

  it("deve incluir ledger.audit.alert", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("ledger.audit.alert");
  });

  it("WebhookEventTypeSchema.parse valida tpra.assessment.completed", () => {
    expect(() =>
      WebhookEventTypeSchema.parse("tpra.assessment.completed"),
    ).not.toThrow();
  });

  it("WebhookEventTypeSchema.parse valida vendor.risk_score.updated", () => {
    expect(() =>
      WebhookEventTypeSchema.parse("vendor.risk_score.updated"),
    ).not.toThrow();
  });

  it("WebhookEventTypeSchema.parse valida ledger.audit.alert", () => {
    expect(() =>
      WebhookEventTypeSchema.parse("ledger.audit.alert"),
    ).not.toThrow();
  });
});
