/**
 * QA Suite — User Lifecycle Consumer Unit Tests
 * Tests domain user provisioning, sync, idempotency, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ─────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

function resetMockDb() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue([]);
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([{ id: "domain-user-001" }]);
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
}

// Mock drizzle + neon
vi.mock("@neondatabase/serverless", () => ({
  neon: () => "mock-sql-client",
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: () => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

vi.mock("@standard/schemas", () => ({
  users: {
    id: "users.id",
    email: "users.email",
    identityProviderSubject: "users.identity_provider_subject",
  },
}));

// Import AFTER mocks
import { processUserLifecycleMessage, type UserLifecycleMessage } from "../../workers/queues/src/user-lifecycle.consumer";

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMockDb();
  vi.clearAllMocks();
});

const baseMessage: UserLifecycleMessage = {
  event: "user.created",
  queue_type: "user_lifecycle",
  idempotency_key: "key-001",
  user: { id: "ba-user-001", email: "test@example.com", name: "Test User" },
  timestamp: "2026-01-01T00:00:00Z",
};

describe("User Lifecycle Consumer — user.created", () => {
  it("skips processing when DATABASE_URL is not set", async () => {
    await processUserLifecycleMessage(baseMessage, {});
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("creates a new domain user when none exists", async () => {
    mockLimit.mockResolvedValueOnce([]); // no existing user

    await processUserLifecycleMessage(baseMessage, { DATABASE_URL: "postgres://test" });

    expect(mockInsert).toHaveBeenCalled();
  });

  it("links existing domain user when email match found", async () => {
    mockLimit.mockResolvedValueOnce([{ id: "existing-domain-001", identityProviderSubject: null }]);

    await processUserLifecycleMessage(
      { ...baseMessage, idempotency_key: "key-002" },
      { DATABASE_URL: "postgres://test" }
    );

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips update when already linked to same BA user", async () => {
    mockLimit.mockResolvedValueOnce([{ id: "existing-domain-001", identityProviderSubject: "ba-user-001" }]);

    await processUserLifecycleMessage(
      { ...baseMessage, idempotency_key: "key-003" },
      { DATABASE_URL: "postgres://test" }
    );

    // Should NOT call update since it's already linked
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("User Lifecycle Consumer — user.updated", () => {
  it("syncs email and displayName for existing user", async () => {
    const updateMessage: UserLifecycleMessage = {
      ...baseMessage,
      event: "user.updated",
      idempotency_key: "key-004",
    };

    await processUserLifecycleMessage(updateMessage, { DATABASE_URL: "postgres://test" });

    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("User Lifecycle Consumer — idempotency", () => {
  it("deduplicates messages with the same idempotency_key within a batch", async () => {
    const msg = { ...baseMessage, idempotency_key: "dedup-key-001" };

    // First call — should process
    await processUserLifecycleMessage(msg, { DATABASE_URL: "postgres://test" });
    expect(mockSelect).toHaveBeenCalledTimes(1);

    // Second call with same key — should skip
    vi.clearAllMocks();
    resetMockDb();
    await processUserLifecycleMessage(msg, { DATABASE_URL: "postgres://test" });
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe("User Lifecycle Consumer — error handling", () => {
  it("re-throws DB errors for queue retry", async () => {
    mockLimit.mockRejectedValueOnce(new Error("DB connection failed"));

    await expect(
      processUserLifecycleMessage(
        { ...baseMessage, idempotency_key: "key-error-001" },
        { DATABASE_URL: "postgres://test" }
      )
    ).rejects.toThrow("DB connection failed");
  });
});
