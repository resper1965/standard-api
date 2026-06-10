/**
 * STRM Weight Algorithm — Contract Tests
 *
 * LEITURA OBRIGATÓRIA: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Secção 1
 *
 * Estes testes definem o CONTRATO do algoritmo de ponderação STRM conforme
 * especificado no Blueprint (NIST IR 8477). São escritos ANTES da implementação.
 *
 * Referência: G09 do Gap Analysis — compliance score ponderado vs binário
 */

import { describe, it, expect } from "vitest";

import {
  computeStrmWeight,
  computeComplianceIndex,
} from "../strm-weight-calculator";

// ── Tipos canónicos (re-exportados do módulo) ────────────────────────
type StrmOperator =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

// ── Testes de Contrato ─────────────────────────────────────────────────────

describe("STRM Weight Calculator — Contrato Blueprint NIST IR 8477", () => {
  // ── Operadores de peso fixo ────────────────────────────────────────────

  describe("Operador = (equal) → peso sempre 1.0", () => {
    it("retorna 1.0 independente de strength_score", () => {
      expect(computeStrmWeight("equal", null)).toBe(1.0);
      expect(computeStrmWeight("equal", 0.5)).toBe(1.0);
      expect(computeStrmWeight("equal", 0.0)).toBe(1.0);
    });
  });

  describe("Operador ⊂ (subset) → peso sempre 1.0", () => {
    it("retorna 1.0 — SCF é mais amplo, garante totalidade do requisito externo", () => {
      expect(computeStrmWeight("subset", null)).toBe(1.0);
      expect(computeStrmWeight("subset", 0.3)).toBe(1.0);
    });
  });

  describe("Operador Ø (no_relation) → peso sempre 0.0", () => {
    it("retorna 0.0 — sem relação, sem contribuição para compliance", () => {
      expect(computeStrmWeight("no_relation", null)).toBe(0.0);
      expect(computeStrmWeight("no_relation", 1.0)).toBe(0.0);
    });
  });

  // ── Operador variável ─────────────────────────────────────────────────

  describe("Operador ∩ (intersects) → peso = strength_score dinâmico", () => {
    it("usa strength_score como peso quando presente", () => {
      expect(computeStrmWeight("intersects", 0.65)).toBe(0.65);
      expect(computeStrmWeight("intersects", 0.1)).toBe(0.1);
      expect(computeStrmWeight("intersects", 0.9)).toBe(0.9);
    });

    it("usa 0.5 como fallback quando strength_score é null", () => {
      expect(computeStrmWeight("intersects", null)).toBe(0.5);
    });

    it("clamp: strength_score não pode exceder 1.0", () => {
      expect(computeStrmWeight("intersects", 1.1)).toBeLessThanOrEqual(1.0);
    });

    it("clamp: strength_score não pode ser negativo", () => {
      expect(computeStrmWeight("intersects", -0.1)).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe("Operador ⊃ (superset) → teto máximo de 0.5", () => {
    it("retorna 0.5 quando strength_score é null", () => {
      expect(computeStrmWeight("superset", null)).toBe(0.5);
    });

    it("retorna min(0.5, strength_score) — teto é 0.5", () => {
      expect(computeStrmWeight("superset", 0.9)).toBe(0.5);
      expect(computeStrmWeight("superset", 1.0)).toBe(0.5);
      expect(computeStrmWeight("superset", 0.3)).toBe(0.3);
      expect(computeStrmWeight("superset", 0.5)).toBe(0.5);
    });
  });

  // ── Segurança de tipos ────────────────────────────────────────────────

  describe("Rejeição de valores legados", () => {
    it("NÃO aceita 'direct' como operador STRM", () => {
      // @ts-expect-error — 'direct' não é StrmOperator válido
      expect(() => computeStrmWeight("direct", null)).toThrow();
    });

    it("NÃO aceita 'related' como operador STRM", () => {
      // @ts-expect-error — 'related' não é StrmOperator válido
      expect(() => computeStrmWeight("related", null)).toThrow();
    });

    it("NÃO aceita 'intersecting' (forma legada) como operador STRM", () => {
      // @ts-expect-error — 'intersecting' não é StrmOperator válido (correto: 'intersects')
      expect(() => computeStrmWeight("intersecting", null)).toThrow();
    });
  });
});

// ── Testes de Integração: Fórmula de Consolidação ────────────────────────

describe("Compliance Index — Fórmula de Consolidação", () => {
  it("cenário binário equivalente: todos equal/subset → 100% se todos mature", () => {
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

  it("superset com maturidade máxima → no máximo 50%", () => {
    const controls = [
      {
        maturity_level: 5,
        strm_operator: "superset" as const,
        strength_score: null,
      },
    ];
    // maturity 5/5 = 1.0; peso 0.5; max possível = 0.5; index = 0.5/0.5 = 1.0
    // NOTA: superset contribui 0.5 de 0.5 possível → 100% do possível
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
    // no_relation não conta para numerador nem denominador
    expect(computeComplianceIndex(controls).index).toBeCloseTo(1.0, 2);
  });

  it("NÃO usa divisão binária implementedControls/totalControls", () => {
    // Este teste documenta o anti-padrão que NÃO deve aparecer
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
    // Binário seria: 1 implemented / 2 total = 0.5
    // STRM correto: (1.0×1.0 + 0.0×0.6) / (1.0 + 0.6) = 1.0/1.6 ≈ 0.625
    expect(result.index).not.toBeCloseTo(0.5, 2); // não deve ser binário
    expect(result.index).toBeCloseTo(0.625, 2); // deve ser STRM ponderado
  });
});

// ── Contrato de Tipos TypeScript (documentação de enforcement) ────────────

/**
 * CONTRATO DE TIPOS — a ser implementado em packages/schemas/src/strm.ts
 *
 * export const STRM_OPERATORS = [
 *   "equal", "subset", "intersects", "superset", "no_relation"
 * ] as const;
 *
 * export type StrmOperator = typeof STRM_OPERATORS[number];
 *
 * // Enum de força (texto) — separado de strength_score (numérico)
 * export const STRM_STRENGTHS = ["strong", "moderate", "weak"] as const;
 * export type StrmStrength = typeof STRM_STRENGTHS[number];
 *
 * // Schema Zod canónico
 * export const StrmOperatorSchema = z.enum(STRM_OPERATORS);
 *
 * // NOTA: ScfRelationshipTypeSchema em packages/schemas/src/scf.ts
 * // deve ser SUBSTITUÍDO por StrmOperatorSchema.
 * // Valores "related", "no_relationship", "source_defined", "intersecting"
 * // são LEGADOS e devem ser removidos após migration.
 */
