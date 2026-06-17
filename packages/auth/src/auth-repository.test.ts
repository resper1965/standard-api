/**
 * AuthRepository Unit Tests
 *
 * Testa o comportamento do repositÃ³rio com mock de DbClient.
 * Sem dados reais â€” fixtures sintÃ©ticas apenas.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthRepository } from "./auth-repository";
import type { UserSummary } from "./auth-repository";

// â”€â”€ Mock DbClient mÃ­nimo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Mock DbClient mÃ­nimo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createMockDb = () => {
  // Estado mutÃ¡vel para simular resultado de queries
  let _queryResult: any[] = [];

  const txFn = vi.fn();
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    orderBy: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    transaction: txFn,
  };

  // Encadear: cada mÃ©todo retorna o mesmo chain
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  // where retorna chain mas limit Ã© o terminal que retorna Promise
  chain.where.mockReturnValue({
    ...chain,
    limit: vi.fn().mockImplementation(() => Promise.resolve(_queryResult)),
  });
  chain.limit.mockImplementation(() => Promise.resolve(_queryResult));

  // update/set/delete chains
  chain.update.mockReturnValue(chain);
  chain.set.mockReturnValue({
    ...chain,
    where: vi.fn().mockResolvedValue(undefined),
  });
  chain.delete.mockReturnValue({
    ...chain,
    where: vi.fn().mockResolvedValue(undefined),
  });

  return {
    ...chain,
    _setResult: (rows: any[]) => {
      _queryResult = rows;
    },
    _reset: () => {
      _queryResult = [];
    },
  };
};

// â”€â”€ Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FAKE_USER: UserSummary = {
  id: "ba-user-001",
  email: "alice@standard.test",
  name: "Alice Standard",
  emailVerified: true,
  image: null,
  platformAdmin: false,
  approved: true,
  jobTitle: "Security Analyst",
  phone: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
};

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("AuthRepository.getUserById", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("retorna null quando usuÃ¡rio nÃ£o existe", async () => {
    mockDb._setResult([]);
    const result = await repo.getUserById("missing-id");
    expect(result).toBeNull();
  });

  it("retorna UserSummary quando usuÃ¡rio existe", async () => {
    mockDb._setResult([FAKE_USER]);
    const result = await repo.getUserById("ba-user-001");
    expect(result).toEqual(FAKE_USER);
    expect(result?.email).toBe("alice@standard.test");
  });
});

describe("AuthRepository.deleteUserCascade", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("chama db.transaction exatamente uma vez", async () => {
    mockDb.transaction.mockImplementationOnce(async (fn: any) => fn(mockDb));
    await repo.deleteUserCascade("ba-user-001");
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("propaga erro da transaÃ§Ã£o (sem swallow silencioso)", async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error("DB timeout"));
    await expect(repo.deleteUserCascade("ba-user-001")).rejects.toThrow(
      "DB timeout",
    );
  });
});

describe("AuthRepository.revokeUser", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("chama db.transaction para revogar acesso + sessÃµes", async () => {
    mockDb.transaction.mockImplementationOnce(async (fn: any) => fn(mockDb));
    await repo.revokeUser("ba-user-001");
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});

describe("AuthRepository.approveUser", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("chama db.transaction para aprovaÃ§Ã£o + revogaÃ§Ã£o de sessÃ£o prÃ©-aprovaÃ§Ã£o", async () => {
    mockDb.transaction.mockImplementationOnce(async (fn: any) => fn(mockDb));
    await repo.approveUser("ba-user-001");
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});

describe("AuthRepository.setSessionOrg", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("chama db.update para settar activeOrganizationId", async () => {
    await repo.setSessionOrg("sess-001", "org-001");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("aceita null para desativar org", async () => {
    await repo.setSessionOrg("sess-001", null);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrganizationId: null }),
    );
  });
});

describe("AuthRepository.revokeOtherSessions", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = createAuthRepository(mockDb as any);
  });

  it("chama db.delete para apagar outras sessoes", async () => {
    // The delete chain returns its own `where` child spy (not the root chain.where).
    // We capture it here to assert correctly.
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValueOnce({ ...mockDb, where: deleteWhere });

    await repo.revokeOtherSessions("ba-user-001", "sess-keep");

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
  });
});

