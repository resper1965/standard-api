/**
 * Webhook TPRA Event Types — W1
 *
 * Tests that TPRA (Third-Party Risk Assessment) webhook event types
 * are properly registered in the WEBHOOK_EVENT_TYPES array and validated
 * by WebhookEventTypeSchema.
 *
 * Reference: packages/schemas/src/webhooks.ts
 *
 * All data is synthetic (AGENTS.md §7).
 */
import { describe, it, expect } from "vitest";
import { WEBHOOK_EVENT_TYPES, WebhookEventTypeSchema } from "../webhooks";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TPRA Webhook Event Types — registration contract", () => {
  it("tpra.vendor.created is registered", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("tpra.vendor.created");
  });

  it("tpra.assessment.submitted is registered", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("tpra.assessment.submitted");
  });

  it("tpra.risk_score.created is registered", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("tpra.risk_score.created");
  });

  it("contains all 3 TPRA events", () => {
    const tpraEvents = WEBHOOK_EVENT_TYPES.filter((e) => e.startsWith("tpra."));
    expect(tpraEvents).toHaveLength(3);
    expect(tpraEvents).toEqual(
      expect.arrayContaining([
        "tpra.vendor.created",
        "tpra.assessment.submitted",
        "tpra.risk_score.created",
      ]),
    );
  });
});

describe("WEBHOOK_EVENT_TYPES — completeness", () => {
  it("has correct total count (15 events)", () => {
    // 12 core lifecycle + 3 TPRA = 15 as declared in webhooks.ts header
    expect(WEBHOOK_EVENT_TYPES).toHaveLength(15);
  });

  it("contains all core lifecycle events", () => {
    const coreEvents = [
      "assessment.created",
      "document.ingested",
      "kb.indexed",
      "soa.approved",
      "gap.approved",
      "maturity.approved",
      "poam.approved",
      "report.generated",
      "report.approved",
      "assessment.closed",
      "workflow.failed",
      "compliance.gate.evaluated",
    ];
    for (const event of coreEvents) {
      expect(WEBHOOK_EVENT_TYPES).toContain(event);
    }
  });
});

describe("WebhookEventTypeSchema — Zod validation", () => {
  it("accepts valid TPRA event type", () => {
    const result = WebhookEventTypeSchema.safeParse("tpra.vendor.created");
    expect(result.success).toBe(true);
  });

  it("accepts valid core event type", () => {
    const result = WebhookEventTypeSchema.safeParse("assessment.created");
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = WebhookEventTypeSchema.safeParse("unknown.event.type");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = WebhookEventTypeSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});
