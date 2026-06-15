// @ts-nocheck -- Zod v4 CI type compat
import { describe, it, expect, vi } from "vitest";
import {
  computeRawScore,
  categoriseRisk,
  computeAndPersistTpraScore,
  type TpraScoreInput,
} from "../tpra-score-service";

describe("computeRawScore â€” lÃ³gica pura de scoring TPRA", () => {
  it("retorna 0 quando responses estÃ¡ vazio", () => {
    expect(computeRawScore({})).toBe(0);
  });

  it("retorna 100 quando todas as respostas sÃ£o 1", () => {
    expect(computeRawScore({ A: 1, B: 1, C: 1 })).toBe(100);
  });

  it("retorna 0 quando todas as respostas sÃ£o 0", () => {
    expect(computeRawScore({ A: 0, B: 0, C: 0 })).toBe(0);
  });

  it("calcula mÃ©dia correcta para respostas mistas", () => {
    // mÃ©dia de 1, 0.5, 0 = 0.5 â†’ 50.00
    expect(computeRawScore({ A: 1, B: 0.5, C: 0 })).toBe(50);
  });

  it("clamp: valores > 1 sÃ£o tratados como 1", () => {
    expect(computeRawScore({ A: 2 })).toBe(100);
  });

  it("clamp: valores < 0 sÃ£o tratados como 0", () => {
    expect(computeRawScore({ A: -1 })).toBe(0);
  });
});

describe("categoriseRisk â€” categorizaÃ§Ã£o de risco por score", () => {
  it("score >= 80 â†’ low", () => {
    expect(categoriseRisk(80)).toBe("low");
    expect(categoriseRisk(100)).toBe("low");
  });

  it("score >= 60 e < 80 â†’ medium", () => {
    expect(categoriseRisk(60)).toBe("medium");
    expect(categoriseRisk(79.99)).toBe("medium");
  });

  it("score >= 40 e < 60 â†’ high", () => {
    expect(categoriseRisk(40)).toBe("high");
    expect(categoriseRisk(59.99)).toBe("high");
  });

  it("score < 40 â†’ critical", () => {
    expect(categoriseRisk(0)).toBe("critical");
    expect(categoriseRisk(39.99)).toBe("critical");
  });
});

describe("computeAndPersistTpraScore â€” contrato de persistÃªncia", () => {
  it("retorna objeto com vendor_id, tpra_assessment_id e score numÃ©rico", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-001",
      responses: { "GDPR-01": 1, "GDPR-02": 0.5, "SEC-01": 0 },
    };
    const insertScore = vi.fn().mockResolvedValue(undefined);

    const result = await computeAndPersistTpraScore(input, { insertScore });

    expect(result).toMatchObject({
      vendor_id: "vendor-uuid-001",
      tpra_assessment_id: expect.any(String),
      raw_score: expect.any(Number),
      risk_category: expect.stringMatching(/^(low|medium|high|critical)$/),
      scf_domain_failures: expect.any(Array),
    });
    expect(result.raw_score).toBeGreaterThanOrEqual(0);
    expect(result.raw_score).toBeLessThanOrEqual(100);
  });

  it("chama insertScore exactamente uma vez", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-002",
      responses: { A: 0.8 },
    };
    const insertScore = vi.fn().mockResolvedValue(undefined);

    await computeAndPersistTpraScore(input, { insertScore });

    expect(insertScore).toHaveBeenCalledTimes(1);
    expect(insertScore).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-uuid-001",
        vendor_id: "vendor-uuid-002",
        raw_score: 80,
        risk_category: "low",
      }),
    );
  });

  it("score 0 â†’ risk_category critical e insertScore chamado", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-003",
      responses: { A: 0, B: 0, C: 0 },
    };
    const insertScore = vi.fn().mockResolvedValue(undefined);

    const result = await computeAndPersistTpraScore(input, { insertScore });

    expect(result.risk_category).toBe("critical");
    expect(insertScore).toHaveBeenCalled();
  });

  it("score 100 â†’ risk_category low", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-004",
      responses: { A: 1, B: 1, C: 1 },
    };
    const result = await computeAndPersistTpraScore(input, {
      insertScore: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.risk_category).toBe("low");
  });
});
