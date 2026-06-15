// @ts-nocheck -- Zod v4 CI type compat
import { describe, it, expect, vi } from "vitest";
import { checkMcpQuota, type QuotaKV } from "../mcp-quota.middleware";

describe("checkMcpQuota â€” per-org KV sliding window", () => {
  const makeKV = (currentCount: number): QuotaKV => ({
    get: vi.fn().mockResolvedValue(currentCount > 0 ? String(currentCount) : null),
    put: vi.fn().mockResolvedValue(undefined),
  });

  it("permite request quando abaixo do limite", async () => {
    const kv = makeKV(5);
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(54); // 60 - 5 - 1 = 54
    expect(result.current).toBe(6);
  });

  it("bloqueia request quando limite exactamente atingido", async () => {
    const kv = makeKV(60);
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("bloqueia request quando limite ultrapassado", async () => {
    const kv = makeKV(75);
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(false);
  });

  it("primeiro request da janela (null no KV) Ã© sempre permitido", async () => {
    const kv = makeKV(0); // get devolve null â†’ parseInt("0") === 0
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.remaining).toBe(59);
  });

  it("incrementa KV com TTL de 65s", async () => {
    const kv = makeKV(3);
    await checkMcpQuota("org-B", kv, { limitPerMinute: 60 });
    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining("mcp:quota:org-B:"),
      "4",
      { expirationTtl: 65 },
    );
  });

  it("nÃ£o incrementa KV quando quota excedida", async () => {
    const kv = makeKV(60);
    await checkMcpQuota("org-C", kv, { limitPerMinute: 60 });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("usa limitPerMinute default de 60 quando config omitido", async () => {
    const kv = makeKV(0);
    const result = await checkMcpQuota("org-D", kv);
    expect(result.limitPerMinute).toBe(60);
  });
});

