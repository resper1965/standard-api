import { describe, it, expect } from "vitest";
import {
  buildStrmControlInputs,
  type SoaItemWithMapping,
} from "../strm-compliance-query";
import { computeComplianceIndex } from "@standard/assessment-engine";

describe("buildStrmControlInputs — contrato ADR-001", () => {
  it("mapeia equal → strm_operator equal, maturity 5 preservado", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-1",
        maturity_level: 5,
        relationship_type: "equal",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.strm_operator).toBe("equal");
    expect(inputs[0]!.maturity_level).toBe(5);
    expect(inputs[0]!.strength_score).toBeNull();
  });

  it("mapeia intersects com strength_score real da DB", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-2",
        maturity_level: 3,
        relationship_type: "intersects",
        strength_score: 0.75,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs[0]!.strm_operator).toBe("intersects");
    expect(inputs[0]!.strength_score).toBe(0.75);
    expect(inputs[0]!.maturity_level).toBe(3);
  });

  it("exclui itens sem mapping (relationship_type = null)", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-3",
        maturity_level: 4,
        relationship_type: null,
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(0);
  });

  it("null maturity_level → 0", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-4",
        maturity_level: null,
        relationship_type: "subset",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.maturity_level).toBe(0);
    expect(inputs[0]!.strm_operator).toBe("subset");
  });

  it("normaliza legacy operator intersecting → intersects", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-5",
        maturity_level: 2,
        relationship_type: "intersecting",
        strength_score: 0.4,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.strm_operator).toBe("intersects");
    expect(inputs[0]!.strength_score).toBe(0.4);
  });

  it("normaliza legacy operator direct → equal", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-6",
        maturity_level: 5,
        relationship_type: "direct",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs[0]!.strm_operator).toBe("equal");
  });

  it("exclui operadores inválidos após normalização", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-7",
        maturity_level: 3,
        relationship_type: "totally_unknown_operator",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(0);
  });

  it("processa lista vazia sem erro", () => {
    const inputs = buildStrmControlInputs([]);
    expect(inputs).toHaveLength(0);
  });

  it("resultado integrado: 2 items equal + 1 intersects → computeComplianceIndex dá resultado real", () => {
    const items: SoaItemWithMapping[] = [
      { control_id: "c1", maturity_level: 5, relationship_type: "equal", strength_score: null },
      { control_id: "c2", maturity_level: 5, relationship_type: "equal", strength_score: null },
      { control_id: "c3", maturity_level: 0, relationship_type: "intersects", strength_score: 0.5 },
    ];
    const inputs = buildStrmControlInputs(items);
    const result = computeComplianceIndex(inputs);
    // 2 controls equal (weight 1.0, maturity 5/5=1.0) + 1 intersects (weight 0.5, maturity 0/5=0.0)
    // numerator: (1.0*1.0 + 1.0*1.0 + 0.5*0.0) = 2.0
    // denominator: 1.0 + 1.0 + 0.5 = 2.5
    // index = 2.0/2.5 = 0.8
    expect(result.index).toBeCloseTo(0.8, 2);
    expect(result.percentage).toBeCloseTo(80, 1);
  });
});
