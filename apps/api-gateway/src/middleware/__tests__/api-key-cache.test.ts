import { describe, it, expect, vi } from "vitest";
import { resolveApiKeyWithCache, type ApiKeyCacheKV } from "../api-key-cache";

// Simula a estrutura mínima de uma API Key resolvida
const makeApiKey = (overrides: Record<string, unknown> = {}) => ({
  id: "key-uuid-001",
  organization_id: "org-uuid-001",
  key_hash: "sha256-abc",
  masked_key: "scf_live_***abc",
  scopes: ["agent:create", "scf:read"],
  revoked_at: null as string | null,
  expires_at: null as string | null,
  ...overrides,
});

const makeKV = (): ApiKeyCacheKV => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
});

describe("resolveApiKeyWithCache — KV fast-path para API Keys M2M", () => {
  it("retorna chave do KV sem chamar verifyKey quando cache hit", async () => {
    const cached = makeApiKey();
    const kv: ApiKeyCacheKV = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cached)),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const verifyKey = vi.fn();

    const result = await resolveApiKeyWithCache("hash-abc", kv, verifyKey);

    expect(result).toMatchObject({ id: "key-uuid-001" });
    expect(verifyKey).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("consulta DB e cacheia quando cache miss", async () => {
    const kv = makeKV();
    const apiKey = makeApiKey();
    const verifyKey = vi.fn().mockResolvedValue(apiKey);

    const result = await resolveApiKeyWithCache("hash-abc", kv, verifyKey);

    expect(result).toMatchObject({ id: "key-uuid-001" });
    expect(verifyKey).toHaveBeenCalledWith("hash-abc");
    expect(kv.put).toHaveBeenCalledWith(
      "apikey:hash-abc",
      expect.stringContaining("key-uuid-001"),
      { expirationTtl: 300 },
    );
  });

  it("não cacheia chaves revogadas", async () => {
    const kv = makeKV();
    const revoked = makeApiKey({ revoked_at: new Date().toISOString() });
    const verifyKey = vi.fn().mockResolvedValue(revoked);

    await resolveApiKeyWithCache("hash-revoked", kv, verifyKey);

    expect(kv.put).not.toHaveBeenCalled();
  });

  it("não cacheia quando verifyKey retorna null (chave inválida)", async () => {
    const kv = makeKV();
    const verifyKey = vi.fn().mockResolvedValue(null);

    const result = await resolveApiKeyWithCache("hash-invalid", kv, verifyKey);

    expect(result).toBeNull();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("não cacheia chaves expiradas", async () => {
    const kv = makeKV();
    const expired = makeApiKey({ expires_at: "2020-01-01T00:00:00Z" });
    const verifyKey = vi.fn().mockResolvedValue(expired);

    await resolveApiKeyWithCache("hash-expired", kv, verifyKey);

    expect(kv.put).not.toHaveBeenCalled();
  });
});
