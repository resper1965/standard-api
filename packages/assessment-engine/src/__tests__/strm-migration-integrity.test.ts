import { describe, it, expect } from "vitest";
import {
  STRM_OPERATORS,
  normaliseRelationshipType,
} from "../strm-normaliser";

describe("STRM Canonical Operators â€” NIST IR 8477", () => {
  it("define exactamente 5 operadores canÃ³nicos", () => {
    expect(STRM_OPERATORS).toHaveLength(5);
    expect(STRM_OPERATORS).toContain("equal");
    expect(STRM_OPERATORS).toContain("subset");
    expect(STRM_OPERATORS).toContain("intersects");
    expect(STRM_OPERATORS).toContain("superset");
    expect(STRM_OPERATORS).toContain("no_relation");
  });

  it("nunca contÃ©m os valores legados do Neon DB", () => {
    expect(STRM_OPERATORS).not.toContain("direct");
    expect(STRM_OPERATORS).not.toContain("related");
    expect(STRM_OPERATORS).not.toContain("intersecting"); // typo legado
  });
});

describe("normaliseRelationshipType â€” conversÃ£o de legado para canÃ³nico", () => {
  // Valores legados do Neon DB (81k registos com estes valores)
  it('converte "direct" â†’ "equal"', () => {
    expect(normaliseRelationshipType("direct")).toBe("equal");
  });

  it('converte "related" â†’ "intersects"', () => {
    expect(normaliseRelationshipType("related")).toBe("intersects");
  });

  it('converte "intersecting" (typo legado xlsx-importer) â†’ "intersects"', () => {
    expect(normaliseRelationshipType("intersecting")).toBe("intersects");
  });

  // Valores jÃ¡ canÃ³nicos (passthrough)
  it("passa-through para valores jÃ¡ canÃ³nicos â€” equal", () => {
    expect(normaliseRelationshipType("equal")).toBe("equal");
  });

  it("passa-through para valores jÃ¡ canÃ³nicos â€” subset", () => {
    expect(normaliseRelationshipType("subset")).toBe("subset");
  });

  it("passa-through para valores jÃ¡ canÃ³nicos â€” intersects", () => {
    expect(normaliseRelationshipType("intersects")).toBe("intersects");
  });

  it("passa-through para valores jÃ¡ canÃ³nicos â€” superset", () => {
    expect(normaliseRelationshipType("superset")).toBe("superset");
  });

  it("passa-through para valores jÃ¡ canÃ³nicos â€” no_relation", () => {
    expect(normaliseRelationshipType("no_relation")).toBe("no_relation");
  });

  it("retorna null para valores totalmente desconhecidos", () => {
    expect(normaliseRelationshipType("unknown_value")).toBeNull();
  });
});

// estimateStrengthScore and its tests were removed with it: migration 0051's
// one-time backfill helper, no production callers, and its `?? 0.5` fallback
// was the strength half of the fabrication family this branch removes.

