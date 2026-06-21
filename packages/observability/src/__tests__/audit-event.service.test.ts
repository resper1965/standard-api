/**
 * @standard/observability — AuditEventService Unit Tests
 *
 * Covers:
 *   1. AuditEventService.record() — validates metadata, persists events correctly
 *   2. Ledger append-only constraint — events can only be appended, never updated
 *   3. assertMetadataSafe() — rejects sensitive field names
 *   4. Redaction — redactValue() and isSensitiveField()
 *
 * Uses synthetic test data only — no real tenant data (per AGENTS.md §7).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @standard/schemas to avoid the broken DB barrel (strmOperatorEnum issue).
// Only re-export the safe sub-modules that AuditEventService actually needs at runtime.
vi.mock("@standard/schemas", async () => {
  const observability = await vi.importActual<Record<string, unknown>>(
    "../../../../packages/schemas/src/observability.ts",
  );
  const common = await vi.importActual<Record<string, unknown>>(
    "../../../../packages/schemas/src/common.ts",
  );
  return { ...common, ...observability };
});

import { AuditEventService } from "../audit/audit-event.service";
import type { RecordAuditEventInput } from "../audit/audit-event.service";
import { assertMetadataSafe, redactValue, isSensitiveField } from "../logger/redaction";
import {
  createInMemoryObservabilityDependencies,
  createInMemoryRepository,
} from "../repositories";
import { SENSITIVE_FIELD_NAMES, DEFAULT_REDACTION_REPLACEMENT } from "../constants";

// ─── Synthetic Fixtures ──────────────────────────────────────────────────────

const ORGANIZATION_ID = "10000000-0000-4000-8000-000000000001";
const ASSESSMENT_ID   = "20000000-0000-4000-8000-000000000002";
const ACTOR_ID        = "30000000-0000-4000-8000-000000000003";
const TRACE_ID        = "trace-audit-test-0001";

function makeInput(overrides: Partial<RecordAuditEventInput> = {}): RecordAuditEventInput {
  return {
    organization_id: ORGANIZATION_ID,
    assessment_id: ASSESSMENT_ID,
    actor_id: ACTOR_ID,
    actor_type: "user",
    action: "assessment_created",
    resource_type: "assessment",
    resource_id: ASSESSMENT_ID,
    outcome: "success",
    trace_id: TRACE_ID,
    ip_address: "127.0.0.1",
    user_agent: "vitest/1.0",
    metadata_safe: { source: "unit-test" },
    ...overrides,
  };
}

// ─── 1. AuditEventService.record() ──────────────────────────────────────────

describe("AuditEventService.record()", () => {
  let service: AuditEventService;
  let deps: ReturnType<typeof createInMemoryObservabilityDependencies>;

  beforeEach(() => {
    deps = createInMemoryObservabilityDependencies();
    service = new AuditEventService(deps);
  });

  it("should persist a valid audit event and return it with id, timestamp and created_at", async () => {
    const event = await service.record(makeInput());

    expect(event.id).toBeDefined();
    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(event.action).toBe("assessment_created");
    expect(event.outcome).toBe("success");
    expect(event.resource_type).toBe("assessment");
    expect(event.trace_id).toBe(TRACE_ID);
    expect(event.timestamp).toBeDefined();
    expect(event.created_at).toBeDefined();
  });

  it("should preserve organization_id and assessment_id when valid UUIDs are given", async () => {
    const event = await service.record(makeInput());

    expect(event.organization_id).toBe(ORGANIZATION_ID);
    expect(event.assessment_id).toBe(ASSESSMENT_ID);
  });

  it("should set organization_id to undefined when non-UUID is given", async () => {
    const event = await service.record(makeInput({ organization_id: "not-a-uuid" }));

    expect(event.organization_id).toBeUndefined();
  });

  it("should set assessment_id to undefined when non-UUID is given", async () => {
    const event = await service.record(makeInput({ assessment_id: "invalid" }));

    expect(event.assessment_id).toBeUndefined();
  });

  it("should set actor_id to undefined and preserve original in metadata_safe when non-UUID actor_id is given", async () => {
    const event = await service.record(makeInput({ actor_id: "system-cron-job" }));

    expect(event.actor_id).toBeUndefined();
    expect(event.metadata_safe).toHaveProperty("original_actor_id", "system-cron-job");
  });

  it("should preserve actor_id when a valid UUID is given", async () => {
    const event = await service.record(makeInput({ actor_id: ACTOR_ID }));

    expect(event.actor_id).toBe(ACTOR_ID);
    expect(event.metadata_safe).not.toHaveProperty("original_actor_id");
  });

  it("should default metadata_safe to empty object when omitted", async () => {
    const event = await service.record(makeInput({ metadata_safe: undefined }));

    expect(event.metadata_safe).toBeDefined();
    expect(typeof event.metadata_safe).toBe("object");
  });

  it("should merge user metadata_safe with internal fields", async () => {
    const event = await service.record(
      makeInput({
        actor_id: "cron-daily",
        metadata_safe: { source: "scheduler", priority: "low" },
      }),
    );

    expect(event.metadata_safe).toHaveProperty("source", "scheduler");
    expect(event.metadata_safe).toHaveProperty("priority", "low");
    expect(event.metadata_safe).toHaveProperty("original_actor_id", "cron-daily");
  });

  it("should store the event in the repository so it can be retrieved", async () => {
    const event = await service.record(makeInput());
    const stored = await deps.auditEvents.get(event.id);

    expect(stored).not.toBeNull();
    expect(stored!.id).toBe(event.id);
    expect(stored!.action).toBe("assessment_created");
  });

  it("should create unique IDs for each event", async () => {
    const event1 = await service.record(makeInput());
    const event2 = await service.record(makeInput());

    expect(event1.id).not.toBe(event2.id);
  });

  it("should throw when metadata_safe contains a sensitive field", async () => {
    await expect(
      service.record(makeInput({ metadata_safe: { password: "secret123" } })),
    ).rejects.toThrow("metadata_safe contains forbidden field: password");
  });

  it("should throw when metadata_safe contains a token field", async () => {
    await expect(
      service.record(makeInput({ metadata_safe: { token: "jwt-value" } })),
    ).rejects.toThrow("metadata_safe contains forbidden field: token");
  });

  it("should support all valid AuditEventAction values", async () => {
    const actions = [
      "assessment_created",
      "assessment_updated",
      "document_uploaded",
      "soa_approved",
      "gap_analysis_approved",
      "report_generated",
    ] as const;

    for (const action of actions) {
      const event = await service.record(makeInput({ action }));
      expect(event.action).toBe(action);
    }
  });

  it("should support all valid AuditOutcome values", async () => {
    const outcomes = ["success", "failure", "denied", "blocked"] as const;

    for (const outcome of outcomes) {
      const event = await service.record(makeInput({ outcome }));
      expect(event.outcome).toBe(outcome);
    }
  });

  it("should handle optional fields being undefined", async () => {
    const event = await service.record({
      action: "assessment_created",
      resource_type: "assessment",
      outcome: "success",
      trace_id: TRACE_ID,
    });

    expect(event.action).toBe("assessment_created");
    expect(event.organization_id).toBeUndefined();
    expect(event.assessment_id).toBeUndefined();
    expect(event.actor_id).toBeUndefined();
    expect(event.ip_address).toBeUndefined();
    expect(event.user_agent).toBeUndefined();
  });
});

// ─── 2. Ledger Append-Only Constraint ───────────────────────────────────────

describe("Ledger append-only constraint", () => {
  let deps: ReturnType<typeof createInMemoryObservabilityDependencies>;
  let service: AuditEventService;

  beforeEach(() => {
    deps = createInMemoryObservabilityDependencies();
    service = new AuditEventService(deps);
  });

  it("should only support create, get, and list — no update or delete methods exist", () => {
    const repo = deps.auditEvents;

    // The repository interface only exposes create, get, list — never update/delete
    expect(typeof repo.create).toBe("function");
    expect(typeof repo.get).toBe("function");
    expect(typeof repo.list).toBe("function");
    expect((repo as Record<string, unknown>)["update"]).toBeUndefined();
    expect((repo as Record<string, unknown>)["delete"]).toBeUndefined();
    expect((repo as Record<string, unknown>)["remove"]).toBeUndefined();
  });

  it("should accumulate events immutably — each create adds without removing prior events", async () => {
    const event1 = await service.record(
      makeInput({ action: "assessment_created", trace_id: "trace-ledger-001" }),
    );
    const event2 = await service.record(
      makeInput({ action: "document_uploaded", trace_id: "trace-ledger-002" }),
    );
    const event3 = await service.record(
      makeInput({ action: "soa_approved", trace_id: "trace-ledger-003" }),
    );

    const all = await deps.auditEvents.list({ organization_id: ORGANIZATION_ID });

    expect(all).toHaveLength(3);
    expect(all.map((e) => e.id)).toContain(event1.id);
    expect(all.map((e) => e.id)).toContain(event2.id);
    expect(all.map((e) => e.id)).toContain(event3.id);
  });

  it("should return events scoped to the correct organization_id", async () => {
    const otherOrg = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    await service.record(makeInput({ organization_id: ORGANIZATION_ID }));
    await service.record(makeInput({ organization_id: otherOrg }));

    const orgEvents = await deps.auditEvents.list({ organization_id: ORGANIZATION_ID });
    const otherEvents = await deps.auditEvents.list({ organization_id: otherOrg });

    expect(orgEvents).toHaveLength(1);
    expect(otherEvents).toHaveLength(1);
    expect(orgEvents[0]!.organization_id).toBe(ORGANIZATION_ID);
    expect(otherEvents[0]!.organization_id).toBe(otherOrg);
  });

  it("should return events scoped to the correct assessment_id", async () => {
    const otherAssessment = "ffffffff-aaaa-4bbb-8ccc-dddddddddddd";

    await service.record(makeInput({ assessment_id: ASSESSMENT_ID }));
    await service.record(makeInput({ assessment_id: otherAssessment }));

    const events = await deps.auditEvents.list({ assessment_id: ASSESSMENT_ID });

    expect(events).toHaveLength(1);
    expect(events[0]!.assessment_id).toBe(ASSESSMENT_ID);
  });

  it("should respect the limit parameter on list", async () => {
    for (let i = 0; i < 5; i++) {
      await service.record(makeInput({ trace_id: `trace-limit-${i}` }));
    }

    const limited = await deps.auditEvents.list({
      organization_id: ORGANIZATION_ID,
      limit: 2,
    });

    expect(limited).toHaveLength(2);
  });

  it("should return null for a non-existent event ID", async () => {
    const result = await deps.auditEvents.get("99999999-9999-4999-8999-999999999999");
    expect(result).toBeNull();
  });
});

// ─── 3. assertMetadataSafe() ────────────────────────────────────────────────

describe("assertMetadataSafe()", () => {
  it("should accept an empty metadata object", () => {
    expect(() => assertMetadataSafe({})).not.toThrow();
  });

  it("should accept metadata with safe field names", () => {
    expect(() =>
      assertMetadataSafe({
        source: "unit-test",
        resource_type: "assessment",
        organization_id: ORGANIZATION_ID,
        assessment_id: ASSESSMENT_ID,
        step: "gap_analysis",
      }),
    ).not.toThrow();
  });

  it.each(
    SENSITIVE_FIELD_NAMES.map((field) => [field]),
  )("should reject metadata containing sensitive field: %s", (field) => {
    expect(() => assertMetadataSafe({ [field]: "some-value" })).toThrow(
      `metadata_safe contains forbidden field: ${field}`,
    );
  });

  it("should be case-insensitive — reject uppercase sensitive field names", () => {
    expect(() => assertMetadataSafe({ PASSWORD: "secret" })).toThrow(
      "metadata_safe contains forbidden field: PASSWORD",
    );
    expect(() => assertMetadataSafe({ Token: "jwt" })).toThrow(
      "metadata_safe contains forbidden field: Token",
    );
    expect(() => assertMetadataSafe({ API_KEY: "key" })).toThrow(
      "metadata_safe contains forbidden field: API_KEY",
    );
  });

  it("should only check top-level keys (not nested ones)", () => {
    // assertMetadataSafe only inspects top-level keys, so nested sensitive fields pass
    expect(() =>
      assertMetadataSafe({
        safe_wrapper: { password: "should-not-throw" },
      }),
    ).not.toThrow();
  });

  it("should throw on the first forbidden field it finds", () => {
    expect(() =>
      assertMetadataSafe({ safe: "ok", token: "bad", password: "also-bad" }),
    ).toThrow(/metadata_safe contains forbidden field/);
  });
});

// ─── 4. Redaction ───────────────────────────────────────────────────────────

describe("redactValue()", () => {
  it("should redact top-level sensitive fields", () => {
    const result = redactValue({
      password: "s3cret",
      token: "jwt-value",
      safe_field: "keep-me",
    }) as Record<string, unknown>;

    expect(result.password).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.token).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.safe_field).toBe("keep-me");
  });

  it("should redact nested sensitive fields", () => {
    const result = redactValue({
      outer: {
        api_key: "key-123",
        authorization: "Bearer abc",
        description: "public",
      },
    }) as Record<string, Record<string, unknown>>;

    expect(result.outer!.api_key).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.outer!.authorization).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.outer!.description).toBe("public");
  });

  it("should redact deeply nested sensitive fields", () => {
    const result = redactValue({
      level1: {
        level2: {
          level3: {
            secret: "deep-secret",
            label: "public-label",
          },
        },
      },
    }) as any;

    expect(result.level1.level2.level3.secret).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.level1.level2.level3.label).toBe("public-label");
  });

  it("should redact sensitive fields inside arrays", () => {
    const result = redactValue([
      { token: "t1", name: "item1" },
      { password: "p1", name: "item2" },
    ]) as Array<Record<string, unknown>>;

    expect(result[0]!.token).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result[0]!.name).toBe("item1");
    expect(result[1]!.password).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result[1]!.name).toBe("item2");
  });

  it("should return primitive values unchanged", () => {
    expect(redactValue("plain-string")).toBe("plain-string");
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBeNull();
    expect(redactValue(undefined)).toBeUndefined();
  });

  it("should return empty object for empty input", () => {
    expect(redactValue({})).toEqual({});
  });

  it("should return empty array for empty array input", () => {
    expect(redactValue([])).toEqual([]);
  });

  it.each(
    SENSITIVE_FIELD_NAMES.map((field) => [field]),
  )("should redact the sensitive field: %s", (field) => {
    const input = { [field]: "sensitive-data", safe: "ok" };
    const result = redactValue(input) as Record<string, unknown>;

    expect(result[field]).toBe(DEFAULT_REDACTION_REPLACEMENT);
    expect(result.safe).toBe("ok");
  });

  it("should not mutate the original object", () => {
    const original = { token: "secret", name: "test" };
    const originalCopy = { ...original };
    redactValue(original);

    expect(original).toEqual(originalCopy);
  });
});

describe("isSensitiveField()", () => {
  it.each(
    SENSITIVE_FIELD_NAMES.map((field) => [field]),
  )("should return true for sensitive field: %s", (field) => {
    expect(isSensitiveField(field)).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(isSensitiveField("PASSWORD")).toBe(true);
    expect(isSensitiveField("Token")).toBe(true);
    expect(isSensitiveField("API_KEY")).toBe(true);
    expect(isSensitiveField("Document_Text")).toBe(true);
  });

  it("should return false for safe field names", () => {
    expect(isSensitiveField("organization_id")).toBe(false);
    expect(isSensitiveField("assessment_id")).toBe(false);
    expect(isSensitiveField("resource_type")).toBe(false);
    expect(isSensitiveField("source")).toBe(false);
    expect(isSensitiveField("action")).toBe(false);
    expect(isSensitiveField("trace_id")).toBe(false);
  });
});
