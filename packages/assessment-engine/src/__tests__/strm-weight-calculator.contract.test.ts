/**
 * STRM Weight Algorithm â€” Contract Tests
 *
 * LEITURA OBRIGATÃ“RIA: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md SecÃ§Ã£o 1
 *
 * Estes testes definem o CONTRATO do algoritmo de ponderaÃ§Ã£o STRM conforme
 * especificado no Blueprint (NIST IR 8477). SÃ£o escritos ANTES da implementaÃ§Ã£o.
 *
 * ReferÃªncia: G09 do Gap Analysis â€” compliance score ponderado vs binÃ¡rio
 */

import { describe, it, expect } from "vitest";

import {
  computeStrmWeight,
  computeComplianceIndex,
} from "../strm-weight-calculator";

// â”€â”€ Tipos canÃ³nicos (re-exportados do mÃ³dulo) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type StrmOperator =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

// â”€â”€ Testes de Contrato â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("STRM Weight Calculator â€” Contrato Blueprint NIST IR 8477", () => {
  // â”€â”€ Operadores de peso fixo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("Operador = (equal) â†’ peso sempre 1.0", () => {
    it("retorna 1.0 independente de strength_score", () => {
      expect(computeStrmWeight("equal", null)).toBe(1.0);
      expect(computeStrmWeight("equal", 0.5)).toBe(1.0);
      expect(computeStrmWeight("equal", 0.0)).toBe(1.0);
    });
  });

  describe("Operador âŠ‚ (subset) â†’ peso sempre 1.0", () => {
    it("retorna 1.0 â€” SCF Ã© mais amplo, garante totalidade do requisito externo", () => {
      expect(computeStrmWeight("subset", null)).toBe(1.0);
      expect(computeStrmWeight("subset", 0.3)).toBe(1.0);
    });
  });

  describe("Operador Ã˜ (no_relation) â†’ peso sempre 0.0", () => {
    it("retorna 0.0 â€” sem relaÃ§Ã£o, sem contribuiÃ§Ã£o para compliance", () => {
      expect(computeStrmWeight("no_relation", null)).toBe(0.0);
      expect(computeStrmWeight("no_relation", 1.0)).toBe(0.0);
    });
  });

  // â”€â”€ Operador variÃ¡vel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("Operador âˆ© (intersects) â†’ peso = strength_score dinÃ¢mico", () => {
    it("usa strength_score como peso quando presente", () => {
      expect(computeStrmWeight("intersects", 0.65)).toBe(0.65);
      expect(computeStrmWeight("intersects", 0.1)).toBe(0.1);
      expect(computeStrmWeight("intersects", 0.9)).toBe(0.9);
    });

    it("usa 0.5 como fallback quando strength_score Ã© null", () => {
      expect(computeStrmWeight("intersects", null)).toBe(0.5);
    });

    it("clamp: strength_score nÃ£o pode exceder 1.0", () => {
      expect(computeStrmWeight("intersects", 1.1)).toBeLessThanOrEqual(1.0);
    });

    it("clamp: strength_score nÃ£o pode ser negativo", () => {
      expect(computeStrmWeight("intersects", -0.1)).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe("Operador âŠƒ (superset) â†’ teto mÃ¡ximo de 0.5", () => {
    it("retorna 0.5 quando strength_score Ã© null", () => {
      expect(computeStrmWeight("superset", null)).toBe(0.5);
    });

    it("retorna min(0.5, strength_score) â€” teto Ã© 0.5", () => {
      expect(computeStrmWeight("superset", 0.9)).toBe(0.5);
      expect(computeStrmWeight("superset", 1.0)).toBe(0.5);
      expect(computeStrmWeight("superset", 0.3)).toBe(0.3);
      expect(computeStrmWeight("superset", 0.5)).toBe(0.5);
    });
  });

  // â”€â”€ SeguranÃ§a de tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("RejeiÃ§Ã£o de valores legados", () => {
    it("NÃƒO aceita 'direct' como operador STRM", () => {
      // @ts-expect-error â€” 'direct' nÃ£o Ã© StrmOperator vÃ¡lido
      expect(() => computeStrmWeight("direct", null)).toThrow();
    });

    it("NÃƒO aceita 'related' como operador STRM", () => {
      // @ts-expect-error â€” 'related' nÃ£o Ã© StrmOperator vÃ¡lido
      expect(() => computeStrmWeight("related", null)).toThrow();
    });

    it("NÃƒO aceita 'intersecting' (forma legada) como operador STRM", () => {
      // @ts-expect-error â€” 'intersecting' nÃ£o Ã© StrmOperator vÃ¡lido (correto: 'intersects')
      expect(() => computeStrmWeight("intersecting", null)).toThrow();
    });
  });
});

// â”€â”€ Testes de IntegraÃ§Ã£o: FÃ³rmula de ConsolidaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Compliance Index â€” FÃ³rmula de ConsolidaÃ§Ã£o", () => {
  it("cenÃ¡rio binÃ¡rio equivalente: todos equal/subset â†’ 100% se todos mature", () => {
    const controls = [
      {
        maturity_level: 5,
        strm_operator: "equal" as const,
        strength_score: null,
      },
      {
        maturity_level: 5,
        strm_operator: "subset" as const,
        strength_score: null,
      },
    ];
    // maturity 5/5 = 1.0; peso 1.0 cada; index = (1.0+1.0)/(1.0+1.0) = 1.0 = 100%
    expect(computeComplianceIndex(controls).index).toBeCloseTo(1.0, 2);
  });

  it("superset com maturidade mÃ¡xima â†’ no mÃ¡ximo 50%", () => {
    const controls = [
      {
        maturity_level: 5,
        strm_operator: "superset" as const,
        strength_score: null,
      },
    ];
    // maturity 5/5 = 1.0; peso 0.5; max possÃ­vel = 0.5; index = 0.5/0.5 = 1.0
    // NOTA: superset contribui 0.5 de 0.5 possÃ­vel â†’ 100% do possÃ­vel
    // Mas significa que ainda falta 50% do requisito externo
    expect(computeComplianceIndex(controls).index).toBeCloseTo(1.0, 2);
  });

  it("no_relation contribui 0 ao numerador e 0 ao denominador", () => {
    const controls = [
      {
        maturity_level: 5,
        strm_operator: "equal" as const,
        strength_score: null,
      },
      {
        maturity_level: 5,
        strm_operator: "no_relation" as const,
        strength_score: null,
      },
    ];
    // no_relation nÃ£o conta para numerador nem denominador
    expect(computeComplianceIndex(controls).index).toBeCloseTo(1.0, 2);
  });

  it("NÃƒO usa divisÃ£o binÃ¡ria implementedControls/totalControls", () => {
    // Este teste documenta o anti-padrÃ£o que NÃƒO deve aparecer
    const controls = [
      {
        maturity_level: 5,
        strm_operator: "equal" as const,
        strength_score: null,
      },
      {
        maturity_level: 0,
        strm_operator: "intersects" as const,
        strength_score: 0.6,
      },
    ];
    const result = computeComplianceIndex(controls);
    // BinÃ¡rio seria: 1 implemented / 2 total = 0.5
    // STRM correto: (1.0Ã—1.0 + 0.0Ã—0.6) / (1.0 + 0.6) = 1.0/1.6 â‰ˆ 0.625
    expect(result.index).not.toBeCloseTo(0.5, 2); // nÃ£o deve ser binÃ¡rio
    expect(result.index).toBeCloseTo(0.625, 2); // deve ser STRM ponderado
  });
});

// â”€â”€ Contrato de Tipos TypeScript (documentaÃ§Ã£o de enforcement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * CONTRATO DE TIPOS â€” a ser implementado em packages/schemas/src/strm.ts
 *
 * export const STRM_OPERATORS = [
 *   "equal", "subset", "intersects", "superset", "no_relation"
 * ] as const;
 *
 * export type StrmOperator = typeof STRM_OPERATORS[number];
 *
 * // Enum de forÃ§a (texto) â€” separado de strength_score (numÃ©rico)
 * export const STRM_STRENGTHS = ["strong", "moderate", "weak"] as const;
 * export type StrmStrength = typeof STRM_STRENGTHS[number];
 *
 * // Schema Zod canÃ³nico
 * export const StrmOperatorSchema = z.enum(STRM_OPERATORS);
 *
 * // NOTA: ScfRelationshipTypeSchema em packages/schemas/src/scf.ts
 * // deve ser SUBSTITUÃDO por StrmOperatorSchema.
 * // Valores "related", "no_relationship", "source_defined", "intersecting"
 * // sÃ£o LEGADOS e devem ser removidos apÃ³s migration.
 */

