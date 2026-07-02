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

// Under the simplified 1:1 auth model, baUser.id IS the domain identity, so the
// consumer no longer syncs a domain `users` table — `processUserLifecycleMessage`
// is a no-op that only logs and deduplicates by idempotency_key.
describe("User Lifecycle Consumer — simplified 1:1 auth model (no domain sync)", () => {
  it("never writes to the domain DB on user.created", async () => {
    await processUserLifecycleMessage(
      { ...baseMessage, idempotency_key: "nodb-created" },
      { DATABASE_URL: "postgres://test" },
    );
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("never writes to the domain DB on user.updated", async () => {
    await processUserLifecycleMessage(
      { ...baseMessage, event: "user.updated", idempotency_key: "nodb-updated" },
      { DATABASE_URL: "postgres://test" },
    );
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("acknowledges without throwing when DATABASE_URL is absent", async () => {
    await expect(
      processUserLifecycleMessage(
        { ...baseMessage, idempotency_key: "nodb-noenv" },
        {},
      ),
    ).resolves.toBeUndefined();
  });

  it("deduplicates messages with the same idempotency_key", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const msg = { ...baseMessage, idempotency_key: "dedup-unique-001" };

    await processUserLifecycleMessage(msg, { DATABASE_URL: "postgres://test" });
    await processUserLifecycleMessage(msg, { DATABASE_URL: "postgres://test" });

    const logged = logSpy.mock.calls.map((c) => String(c[0]));
    logSpy.mockRestore();
    expect(logged.some((l) => l.includes("user_lifecycle_acknowledged"))).toBe(
      true,
    );
    expect(logged.some((l) => l.includes("user_lifecycle_deduplicated"))).toBe(
      true,
    );
  });
});
