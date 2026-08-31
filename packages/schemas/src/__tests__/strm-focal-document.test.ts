import { describe, it, expect } from "vitest";
import {
  strmDedupeKey,
  normaliseFrameworkKey,
  resolveFrameworkId,
  pickUnambiguousMappingId,
  buildFrameworkByName,
} from "../strm-focal-document.js";

describe("strmDedupeKey", () => {
  it("separates the same code in two focal documents", () => {
    expect(strmDedupeKey("ctrl-1", "1.1.1", "cis-v8.xlsx")).not.toBe(
      strmDedupeKey("ctrl-1", "1.1.1", "pci-dss.xlsx"),
    );
  });

  it("collapses the same code in the same focal document, case and space insensitively", () => {
    expect(strmDedupeKey("ctrl-1", " AC-1 ", "nist.xlsx")).toBe(
      strmDedupeKey("ctrl-1", "ac-1", "nist.xlsx"),
    );
  });
});

describe("resolveFrameworkId", () => {
  const byName = new Map([
    [normaliseFrameworkKey("ISO 27001:2022"), "fw-iso"],
    [normaliseFrameworkKey("NIST SP 800-53 R5"), "fw-nist"],
  ]);

  it("resolves an exact name, ignoring case and surrounding space", () => {
    expect(resolveFrameworkId("  iso 27001:2022 ", byName)).toBe("fw-iso");
  });

  it("returns null rather than guessing at a near miss", () => {
    // "NIST SP 800-53" is a prefix of a real entry. A fuzzy matcher would
    // return fw-nist and reintroduce exactly the misattribution 0060 removed.
    expect(resolveFrameworkId("NIST SP 800-53", byName)).toBe(null);
    expect(resolveFrameworkId("", byName)).toBe(null);
  });
});

describe("buildFrameworkByName", () => {
  it("resolves a name held by exactly one row", () => {
    const { byName, collidedKeys } = buildFrameworkByName([
      { id: "fw-iso", name: "ISO 27001:2022" },
    ]);
    expect(byName.get(normaliseFrameworkKey("ISO 27001:2022"))).toBe("fw-iso");
    expect(collidedKeys.size).toBe(0);
  });

  it("resolves a colliding name to null, not to either id", () => {
    // scf_frameworks is unique on (scf_version_id, framework_id), not name:
    // two SCF versions can each contribute a row named "ISO 27001:2022".
    const { byName, collidedKeys } = buildFrameworkByName([
      { id: "fw-v1", name: "ISO 27001:2022" },
      { id: "fw-v2", name: "ISO 27001:2022" },
    ]);
    expect(byName.has(normaliseFrameworkKey("ISO 27001:2022"))).toBe(false);
    expect(collidedKeys.has(normaliseFrameworkKey("ISO 27001:2022"))).toBe(
      true,
    );
  });

  it("keeps a collision collided even with a third row of the same name", () => {
    const { byName, collidedKeys } = buildFrameworkByName([
      { id: "fw-v1", name: "ISO 27001:2022" },
      { id: "fw-v2", name: "ISO 27001:2022" },
      { id: "fw-v3", name: "ISO 27001:2022" },
    ]);
    expect(byName.has(normaliseFrameworkKey("ISO 27001:2022"))).toBe(false);
    expect(collidedKeys.has(normaliseFrameworkKey("ISO 27001:2022"))).toBe(
      true,
    );
  });

  it("does not let a collision on one name affect an unrelated name", () => {
    const { byName } = buildFrameworkByName([
      { id: "fw-v1", name: "ISO 27001:2022" },
      { id: "fw-v2", name: "ISO 27001:2022" },
      { id: "fw-nist", name: "NIST SP 800-53 R5" },
    ]);
    expect(byName.get(normaliseFrameworkKey("NIST SP 800-53 R5"))).toBe(
      "fw-nist",
    );
  });
});

describe("pickUnambiguousMappingId", () => {
  it("returns the id when exactly one mapping exists", () => {
    expect(pickUnambiguousMappingId(["m1"])).toBe("m1");
  });

  it("returns null when several exist", () => {
    // The seeder used to take [0] here — an arbitrary requirement's mapping
    // attached to a different requirement's STRM row.
    expect(pickUnambiguousMappingId(["m1", "m2"])).toBe(null);
    expect(pickUnambiguousMappingId([])).toBe(null);
    expect(pickUnambiguousMappingId(undefined)).toBe(null);
  });
});
