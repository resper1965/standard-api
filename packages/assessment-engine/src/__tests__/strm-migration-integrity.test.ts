import { describe, it, expect } from "vitest";
import {
  STRM_OPERATORS,
  normaliseRelationshipType,
  estimateStrengthScore,
} from "../strm-normaliser";

describe("STRM Canonical Operators — NIST IR 8477", () => {
  it("define exactamente 5 operadores canónicos", () => {
    expect(STRM_OPERATORS).toHaveLength(5);
    expect(STRM_OPERATORS).toContain("equal");
    expect(STRM_OPERATORS).toContain("subset");
    expect(STRM_OPERATORS).toContain("intersects");
    expect(STRM_OPERATORS).toContain("superset");
    expect(STRM_OPERATORS).toContain("no_relation");
  });

  it("nunca contém os valores legados do Neon DB", () => {
    expect(STRM_OPERATORS).not.toContain("direct");
    expect(STRM_OPERATORS).not.toContain("related");
    expect(STRM_OPERATORS).not.toContain("intersecting"); // typo legado
  });
});

describe("normaliseRelationshipType — conversão de legado para canónico", () => {
  // Valores legados do Neon DB (81k registos com estes valores)
  it('converte "direct" → "equal"', () => {
    expect(normaliseRelationshipType("direct")).toBe("equal");
  });

  it('converte "related" → "intersects"', () => {
    expect(normaliseRelationshipType("related")).toBe("intersects");
  });

  it('converte "intersecting" (typo legado xlsx-importer) → "intersects"', () => {
    expect(normaliseRelationshipType("intersecting")).toBe("intersects");
  });

  // Valores já canónicos (passthrough)
  it("passa-through para valores já canónicos — equal", () => {
    expect(normaliseRelationshipType("equal")).toBe("equal");
  });

  it("passa-through para valores já canónicos — subset", () => {
    expect(normaliseRelationshipType("subset")).toBe("subset");
  });

  it("passa-through para valores já canónicos — intersects", () => {
    expect(normaliseRelationshipType("intersects")).toBe("intersects");
  });

  it("passa-through para valores já canónicos — superset", () => {
    expect(normaliseRelationshipType("superset")).toBe("superset");
  });

  it("passa-through para valores já canónicos — no_relation", () => {
    expect(normaliseRelationshipType("no_relation")).toBe("no_relation");
  });

  it("retorna null para valores totalmente desconhecidos", () => {
    expect(normaliseRelationshipType("unknown_value")).toBeNull();
  });
});

describe("estimateStrengthScore — conversão de texto legado para numérico", () => {
  it('converte "strong" → 1.0', () => {
    expect(estimateStrengthScore("strong")).toBe(1.0);
  });

  it('converte "high" → 1.0', () => {
    expect(estimateStrengthScore("high")).toBe(1.0);
  });

  it('converte "moderate" → 0.5', () => {
    expect(estimateStrengthScore("moderate")).toBe(0.5);
  });

  it('converte "related" (legado ambíguo) → 0.5', () => {
    expect(estimateStrengthScore("related")).toBe(0.5);
  });

  it('converte "weak" → 0.25', () => {
    expect(estimateStrengthScore("weak")).toBe(0.25);
  });

  it("retorna 0.5 como fallback conservador para valores desconhecidos", () => {
    expect(estimateStrengthScore("unknown")).toBe(0.5);
  });

  it("não produz valores fora do intervalo [0.0, 1.0]", () => {
    const values = ["strong", "high", "moderate", "medium", "weak", "low", "related", "unknown"];
    for (const v of values) {
      const score = estimateStrengthScore(v);
      expect(score).toBeGreaterThanOrEqual(0.0);
      expect(score).toBeLessThanOrEqual(1.0);
    }
  });
});
