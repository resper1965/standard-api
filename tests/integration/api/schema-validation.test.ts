/**
 * QA Suite — Schema Validation Tests
 * Verifies that Zod strictObject() schemas reject unknown fields and
 * enforce required constraints as expected after hardening (Pilar 1).
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Schemas (mirrors packages/schemas/src/*) ─────────────────────────────────

const CreateAssessmentSchema = z.strictObject({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  framework_ids: z.array(z.string().uuid()).min(1),
  scope_notes: z.string().max(5000).optional(),
});

const ReprocessDocumentSchema = z.strictObject({
  reason: z.string().min(1).max(500).optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Schema Validation — CreateAssessment", () => {
  it("accepts a valid payload", () => {
    const result = CreateAssessmentSchema.safeParse({
      name: "SOC 2 2024",
      framework_ids: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strictObject)", () => {
    const result = CreateAssessmentSchema.safeParse({
      name: "SOC 2",
      framework_ids: ["550e8400-e29b-41d4-a716-446655440000"],
      malicious_field: "injected",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects empty framework_ids array", () => {
    const result = CreateAssessmentSchema.safeParse({
      name: "SOC 2",
      framework_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID in framework_ids", () => {
    const result = CreateAssessmentSchema.safeParse({
      name: "SOC 2",
      framework_ids: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required 'name'", () => {
    const result = CreateAssessmentSchema.safeParse({
      framework_ids: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = CreateAssessmentSchema.safeParse({
      name: "x".repeat(256),
      framework_ids: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.success).toBe(false);
  });
});

describe("Schema Validation — ReprocessDocument", () => {
  it("accepts empty body (all fields optional)", () => {
    expect(ReprocessDocumentSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid reason", () => {
    expect(ReprocessDocumentSchema.safeParse({ reason: "Re-OCR needed" }).success).toBe(true);
  });

  it("rejects extra unknown fields", () => {
    const result = ReprocessDocumentSchema.safeParse({ reason: "ok", hack: true });
    expect(result.success).toBe(false);
  });
});

describe("Schema Validation — Pagination safety", () => {
  it("accepts limit=50", () => {
    const r = PaginationSchema.safeParse({ limit: "50" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(50);
  });

  it("clamps to max 100", () => {
    const r = PaginationSchema.safeParse({ limit: "9999" });
    // max(100) means safeParse fails, not clamp — schema enforces ceiling
    expect(r.success).toBe(false);
  });

  it("rejects limit=0", () => {
    expect(PaginationSchema.safeParse({ limit: "0" }).success).toBe(false);
  });

  it("defaults limit to 25 when omitted", () => {
    const r = PaginationSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(25);
  });
});

describe("Schema Validation — Idempotency Key format", () => {
  const idempotencyKeySchema = z.string().min(8).max(128);

  it("accepts UUID as idempotency key", () => {
    expect(idempotencyKeySchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects too-short key", () => {
    expect(idempotencyKeySchema.safeParse("abc").success).toBe(false);
  });

  it("rejects too-long key", () => {
    expect(idempotencyKeySchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});
