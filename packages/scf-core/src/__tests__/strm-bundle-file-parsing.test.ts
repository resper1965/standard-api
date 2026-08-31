import { describe, it, expect, afterEach } from "vitest";
import ExcelJS from "exceljs";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseStrmBundleFile } from "../importers/strm-bundle-importer.js";

// Regression coverage for two defects found running the importer against the
// real 183-file STRM bundle:
//
//   - defect 2: the streaming XLSX reader (needed because exceljs's
//     non-streaming loader crashes on 175/183 real bundle files) yields
//     genuinely-blank rows that `eachRow({ includeEmpty: false })` used to
//     drop, which shifts every fixed row offset the parser relies on.
//   - defect 3: `framework_name` must come from row 0 col 6 (the focal
//     document name), not the sheet name — real files are almost all
//     named "Sheet1".
//
// A synthetic fixture is built with ExcelJS itself (the same library the
// importer reads with) and written to a real temp .xlsx file, because the
// bug is a property of what the streaming reader emits for physically
// blank rows — a plain in-memory row array can't reproduce that.

const fixtureDir = path.join(__dirname, ".tmp-strm-fixtures");
const written: string[] = [];

afterEach(() => {
  for (const f of written.splice(0)) fs.rmSync(f, { force: true });
});

async function writeFixture(
  name: string,
  build: (ws: ExcelJS.Worksheet) => void,
): Promise<string> {
  fs.mkdirSync(fixtureDir, { recursive: true });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  build(ws);
  const filePath = path.join(fixtureDir, name);
  await wb.xlsx.writeFile(filePath);
  written.push(filePath);
  return filePath;
}

describe("parseStrmBundleFile", () => {
  it("reads framework_name from row 0 col 6, not the 'Sheet1' sheet name", async () => {
    const filePath = await writeFixture("framework-name.xlsx", (ws) => {
      ws.getCell("F1").value = "Focal Document: ";
      ws.getCell("G1").value = "Australia -Essential Eight maturity model (2024)";
      ws.getCell("G2").value = "https://example.com/focal";
      ws.getCell("G3").value = "https://example.com/strm";
      ws.getCell("A4").value = "FDE #";
      ws.getCell("A5").value = "FDE-1";
      ws.getCell("E5").value = "Equal";
      ws.getCell("G5").value = "SCF-1";
    });

    const result = await parseStrmBundleFile(filePath, "framework-name.xlsx");

    expect(result.framework_name).toBe(
      "Australia -Essential Eight maturity model (2024)",
    );
    expect(result.framework_name).not.toBe("Sheet1");
  });

  it("falls back to the sheet name when row 0 col 6 is blank", async () => {
    const filePath = await writeFixture("framework-name-fallback.xlsx", (ws) => {
      // Row 1 exists (label present) but the framework-name cell itself is blank.
      ws.getCell("F1").value = "Focal Document: ";
      ws.getCell("G2").value = "https://example.com/focal";
      ws.getCell("G3").value = "https://example.com/strm";
      ws.getCell("A4").value = "FDE #";
      ws.getCell("A5").value = "FDE-1";
      ws.getCell("E5").value = "Equal";
      ws.getCell("G5").value = "SCF-1";
    });

    const result = await parseStrmBundleFile(
      filePath,
      "framework-name-fallback.xlsx",
    );

    expect(result.framework_name).toBe("Sheet1");
  });

  it("keeps the fixed row offsets when a genuinely blank row precedes the header", async () => {
    // Row layout (1-indexed, matches the real bundle's metadata block):
    //   1: focal document name
    //   2: focal document URL
    //   3: published STRM URL
    //   4: a real but entirely empty row (present in the sheet, all cells "")
    //   5: header row
    //   6: data row
    const filePath = await writeFixture("blank-row-shift.xlsx", (ws) => {
      ws.getCell("F1").value = "Focal Document: ";
      ws.getCell("G1").value = "Test Framework";
      ws.getCell("G2").value = "https://example.com/focal";
      ws.getCell("G3").value = "https://example.com/strm";
      // A cell assigned an empty string forces ExcelJS to materialize row 4
      // in the sheet, matching the real bundle's phantom blank row that the
      // streaming reader (unlike eachRow({includeEmpty:false})) yields.
      ws.getCell("A4").value = "";
      ws.getCell("A5").value = "FDE #"; // header row
      ws.getCell("A6").value = "FDE-1";
      ws.getCell("B6").value = "Some Requirement";
      ws.getCell("E6").value = "Equal";
      ws.getCell("F6").value = "SCF Control Name";
      ws.getCell("G6").value = "SCF-1";
      ws.getCell("I6").value = 9;
    });

    const result = await parseStrmBundleFile(filePath, "blank-row-shift.xlsx");

    expect(result.warnings).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      fde_code: "FDE-1",
      fde_name: "Some Requirement",
      relationship_type: "equal",
      scf_code: "SCF-1",
      scf_control_name: "SCF Control Name",
    });
  });
});
