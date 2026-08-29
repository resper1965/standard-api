import { describe, it, expect } from "vitest";
import {
  strmDedupeKey,
  normaliseFrameworkKey,
  resolveFrameworkId,
  pickUnambiguousMappingId,
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
