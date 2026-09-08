import { describe, it, expect } from "vitest";
import {
  strmDedupeKey,
  pickUnambiguousMappingId,
  fdiFromBundleFilename,
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

describe("fdiFromBundleFilename", () => {
  it("extracts the identifier from a bundle filename", () => {
    expect(fdiFromBundleFilename("scf-strm-general-aicpa-tsc-2017.xlsx"))
      .toBe("general-aicpa-tsc-2017");
  });

  it("is case- and path-insensitive", () => {
    expect(fdiFromBundleFilename("SCF-STRM-Emea-Eu-Gdpr-2016.XLSX"))
      .toBe("emea-eu-gdpr-2016");
  });

  it("returns null for anything not shaped like a bundle file", () => {
    // Not a guess-and-hope: a file we cannot identify resolves to no
    // framework and grades nothing, which is the safe direction.
    expect(fdiFromBundleFilename("notes.xlsx")).toBe(null);
    expect(fdiFromBundleFilename("scf-strm-.xlsx")).toBe(null);
    expect(fdiFromBundleFilename("")).toBe(null);
  });

  // Three files out of 183 are named for an identifier the catalogue does not
  // publish. Each was checked against scf_frameworks and resolves to exactly
  // one row; together they carry 5,589 mappings that graded nothing.
  it("corrects the three known vendor filename defects", () => {
    expect(
      fdiFromBundleFilename("scf-strm-general-general-mitre-att_ck-16-1.xlsx"),
    ).toBe("general-mitre-att&ck-16-1");
    expect(
      fdiFromBundleFilename("scf-strm-general-general-mpa-csbp-5-3-1.xlsx"),
    ).toBe("general-mpa-csbp-5-3-1");
    expect(fdiFromBundleFilename("scf-strm-scf-dpmp-2025.xlsx")).toBe(
      "general-scf-dpmp-2025",
    );
  });

  it("corrects only those three, and generalises to nothing", () => {
    // The corrections are a record of three defects, not a rule. A prefix- or
    // punctuation-tolerant lookup is how one framework's operators come to
    // grade another's requirements, which is the failure this branch exists to
    // end — so a filename that merely resembles one of the three is passed
    // through untouched and resolves by exact match or not at all.
    expect(fdiFromBundleFilename("scf-strm-general-general-iso-27001.xlsx")).toBe(
      "general-general-iso-27001",
    );
    expect(fdiFromBundleFilename("scf-strm-general-mitre-att_ck-17-0.xlsx")).toBe(
      "general-mitre-att_ck-17-0",
    );
    expect(fdiFromBundleFilename("scf-strm-dpmp-2025.xlsx")).toBe("dpmp-2025");
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
