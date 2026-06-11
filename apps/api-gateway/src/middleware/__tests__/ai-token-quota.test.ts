/**
 * AI Token Quota Middleware — M2
 *
 * Tests the checkAiTokenQuota pure function from ai-token-quota.middleware.ts.
 *
 * The middleware checks per-organization monthly AI token budgets via KV.
 * It is a pure function: reads KV, returns allowed/denied. Does NOT write.
 *
 * KV key format: org:{organizationId}:ai_tokens:{YYYY-MM}
 *
 * All data is synthetic (AGENTS.md §7). No real KV required.
 */
import { describe, it, expect } from "vitest";
import {
  checkAiTokenQuota,
  type AiTokenQuotaKV,
} from "../ai-token-quota.middleware";

// ── Synthetic IDs ────────────────────────────────────────────────────────────
const FAKE_ORG_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// ── KV Helpers ───────────────────────────────────────────────────────────────

/** Creates a fake KV that returns a fixed value for any key */
const createFakeKV = (value: string | null): AiTokenQuotaKV => ({
  get: async (_key: string) => value,
});

/** Creates a KV that captures the requested key for assertion */
const createCapturingKV = (): {
  kv: AiTokenQuotaKV;
  capturedKey: string | null;
} => {
  const state = { capturedKey: null as string | null };
  return {
    kv: {
      get: async (key: string) => {
        state.capturedKey = key;
        return null;
      },
    },
    capturedKey: null,
    get captured() {
      return state.capturedKey;
    },
  };
};

/** Creates a KV that throws (simulating unavailability) */
const createFailingKV = (): AiTokenQuotaKV => ({
  get: async () => {
    throw new Error("KV unavailable");
  },
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AI Token Quota — checkAiTokenQuota", () => {
  describe("Under budget → allows request", () => {
    it("allows when usage is 0", async () => {
      const kv = createFakeKV(null); // null = no usage recorded
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
      expect(result.budget).toBe(1_000_000);
    });

    it("allows when usage is below budget", async () => {
      const kv = createFakeKV("500000");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(500_000);
    });

    it("allows when usage is 1 below budget", async () => {
      const kv = createFakeKV("999999");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(999_999);
    });
  });

  describe("Over budget → denies request (429-like)", () => {
    it("denies when usage equals budget", async () => {
      const kv = createFakeKV("1000000");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result.allowed).toBe(false);
      expect(result.used).toBe(1_000_000);
    });

    it("denies when usage exceeds budget", async () => {
      const kv = createFakeKV("2000000");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result.allowed).toBe(false);
      expect(result.used).toBe(2_000_000);
    });
  });

  describe("Custom budget config", () => {
    it("uses custom budgetPerMonth when provided", async () => {
      const kv = createFakeKV("100");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv, {
        budgetPerMonth: 50,
      });
      expect(result.allowed).toBe(false);
      expect(result.budget).toBe(50);
    });

    it("defaults to 1M tokens/month when config is empty", async () => {
      const kv = createFakeKV(null);
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv, {});
      expect(result.budget).toBe(1_000_000);
    });
  });

  describe("KV key format", () => {
    it("key follows org:{id}:ai_tokens:{YYYY-MM} pattern", async () => {
      const capture = createCapturingKV();
      await checkAiTokenQuota(FAKE_ORG_ID, capture.kv);
      const key = capture.captured;
      expect(key).not.toBeNull();
      // Expected format: org:cccccccc-cccc-4ccc-8ccc-cccccccccccc:ai_tokens:YYYY-MM
      const regex = /^org:[a-f0-9-]+:ai_tokens:\d{4}-\d{2}$/;
      expect(key).toMatch(regex);
      expect(key).toContain(FAKE_ORG_ID);
    });
  });

  describe("Reset date", () => {
    it("resetDate is a valid ISO 8601 date string", async () => {
      const kv = createFakeKV(null);
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      // Must be parseable as a Date
      const parsed = new Date(result.resetDate);
      expect(parsed.toString()).not.toBe("Invalid Date");
    });

    it("resetDate is the 1st of the next month at 00:00:00 UTC", async () => {
      const kv = createFakeKV(null);
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      const parsed = new Date(result.resetDate);
      expect(parsed.getUTCDate()).toBe(1);
      expect(parsed.getUTCHours()).toBe(0);
      expect(parsed.getUTCMinutes()).toBe(0);
      expect(parsed.getUTCSeconds()).toBe(0);
    });
  });

  describe("KV unavailable → graceful fallback", () => {
    it("throws if KV fails (caller handles gracefully)", async () => {
      const kv = createFailingKV();
      // The function itself does not catch KV errors — the middleware
      // wrapper or caller is expected to handle this gracefully.
      // This test documents the current behavior.
      await expect(checkAiTokenQuota(FAKE_ORG_ID, kv)).rejects.toThrow(
        "KV unavailable",
      );
    });
  });

  describe("Result shape", () => {
    it("result contains allowed, used, budget, resetDate", async () => {
      const kv = createFakeKV("42");
      const result = await checkAiTokenQuota(FAKE_ORG_ID, kv);
      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("used");
      expect(result).toHaveProperty("budget");
      expect(result).toHaveProperty("resetDate");
      expect(typeof result.allowed).toBe("boolean");
      expect(typeof result.used).toBe("number");
      expect(typeof result.budget).toBe("number");
      expect(typeof result.resetDate).toBe("string");
    });
  });
});
