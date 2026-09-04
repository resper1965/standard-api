import { describe, it, expect } from "vitest";
import {
  resolveBundleColumns,
  metaValueAfterLabel,
  rowValuesToCellsOrNull,
} from "../importers/strm-bundle-importer.js";

// defect 4, found running the importer against the real 183-file bundle:
// `scf-strm-usa-federal-doe-c2m2-2-1.xlsx` duplicates its first column ("FDE #"
// twice), shifting every later column right by one. Read at fixed offsets, its
// STRM Relationship column landed on STRM Rationale — whose value is the
// literal "Functional", which parseStrmOperatorCell classifies as a leaked
// header row. All 567 rows of that framework were discarded in silence, and
// were counted as leaked headers in the figure reported to the customer.
//
// These are plain-array tests on purpose. The behaviour is pure column
// arithmetic, and driving it through a written .xlsx makes the test flaky:
// ExcelJS emits zip entries in non-deterministic order, and a fixture large
// enough to carry eleven headers intermittently puts worksheets/sheet1.xml
// ahead of workbook.xml, which crashes its own streaming reader. The real
// bundle files are written by Excel and do not have that problem.

const SHIFTED_HEADER = [
  "FDE #",
  "FDE #",
  "FDE Name",
  "Focal Document Element",
  "STRM Rationale",
  "STRM Relationship",
  "SCF Control",
  "SCF #",
  "Secure Controls Framework (SCF) Control Description",
  "Strength of Relationship",
  "Notes",
];

const NORMAL_HEADER = [
  "FDE #",
  "FDE Name",
  "Focal Document Element",
  "STRM Rationale",
  "STRM Relationship",
  "SCF Control",
  "SCF #",
  "Secure Controls Framework (SCF) Control Description",
  "Strength of Relationship",
  "Notes",
];

describe("resolveBundleColumns", () => {
  it("resolves the 182 files whose layout is the expected one", () => {
    expect(resolveBundleColumns(NORMAL_HEADER)).toEqual({
      fdeCode: 0,
      fdeName: 1,
      rationale: 3,
      relationship: 4,
      scfControlName: 5,
      scfCode: 6,
      strength: 8,
      notes: 9,
    });
  });

  it("follows the shift when a file duplicates its first column", () => {
    const col = resolveBundleColumns(SHIFTED_HEADER);
    // The operator is the whole point: at the old fixed index 4 this row reads
    // "Functional" and the entire file is dropped.
    expect(col.relationship).toBe(5);
    expect(SHIFTED_HEADER[col.relationship]).toBe("STRM Relationship");
    expect(col.scfCode).toBe(7);
    expect(col.scfControlName).toBe(6);
    expect(col.strength).toBe(9);
    expect(col.notes).toBe(10);
  });

  it("takes the leftmost of the duplicated FDE columns", () => {
    // The catalogue writes C2M2 requirement codes as "ACCESS-1a"; the second
    // column carries a dotted variant. fde_code is what the backfill joins on,
    // so the leftmost is the one that matches.
    expect(resolveBundleColumns(SHIFTED_HEADER).fdeCode).toBe(0);
  });

  it("matches headers case- and whitespace-insensitively", () => {
    const noisy = ["fde  #", "FDE\nName", " strm relationship "];
    const col = resolveBundleColumns(noisy);
    expect(col.fdeCode).toBe(0);
    expect(col.fdeName).toBe(1);
    expect(col.relationship).toBe(2);
  });

  it("falls back to the fixed offset for a header the file does not name", () => {
    // Not a guess dressed as a match: a file with no header row keeps exactly
    // the offsets the parser used before, so no existing file changes meaning.
    expect(resolveBundleColumns([])).toEqual(
      resolveBundleColumns(NORMAL_HEADER),
    );
  });
});

describe("rowValuesToCellsOrNull", () => {
  // Every offset in the parser is counted from the first non-blank row, so a
  // blank row that survives this filter shifts the metadata, the header and
  // every data row by one.
  it("drops index 0, which ExcelJS always leaves undefined", () => {
    expect(rowValuesToCellsOrNull([undefined, "FDE #", "FDE Name"])).toEqual([
      "FDE #",
      "FDE Name",
    ]);
  });

  it("returns null for a row whose cells are all blank or whitespace", () => {
    expect(rowValuesToCellsOrNull([undefined, "", "   ", undefined])).toBeNull();
    expect(rowValuesToCellsOrNull([undefined])).toBeNull();
  });

  it("keeps a row held up by a single value, including a zero", () => {
    expect(rowValuesToCellsOrNull([undefined, "", 0, ""])).toEqual(["", 0, ""]);
  });
});

describe("metaValueAfterLabel", () => {
  const normalRow = [
    "NIST IR 8477-Based Set Theory Relationship Mapping",
    "",
    "",
    "",
    "",
    "Focal Document: ",
    "ISO 27001:2022",
  ];
  const shiftedRow = [
    "NIST IR 8477-Based Set Theory Relationship Mapping",
    "",
    "",
    "",
    "",
    "",
    "Focal Document: ",
    "Cybersecurity Capability Maturity Model (C2M2)",
  ];

  it("reads the cell to the right of the label, wherever the label sits", () => {
    expect(metaValueAfterLabel(normalRow, "focal document:")).toBe(
      "ISO 27001:2022",
    );
    expect(metaValueAfterLabel(shiftedRow, "focal document:")).toBe(
      "Cybersecurity Capability Maturity Model (C2M2)",
    );
  });

  it("does not confuse the URL label with the name label", () => {
    // "focal document url:" also begins with "focal document", so a looser
    // prefix test would return the URL as the framework's name.
    const bothLabels = [
      "Focal Document URL: ",
      "https://example.com",
      "Focal Document: ",
      "ISO 27001:2022",
    ];
    expect(metaValueAfterLabel(bothLabels, "focal document:")).toBe(
      "ISO 27001:2022",
    );
    expect(metaValueAfterLabel(bothLabels, "focal document url:")).toBe(
      "https://example.com",
    );
  });

  it("falls back to index 6 when the label is absent, and to empty for no row", () => {
    expect(metaValueAfterLabel(["a", "b", "c", "d", "e", "f", "g"], "focal document:")).toBe("g");
    expect(metaValueAfterLabel(undefined, "focal document:")).toBe("");
  });
});
