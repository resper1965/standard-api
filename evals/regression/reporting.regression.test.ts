import { expect, test } from "../../tests/test-kit";
import { loadGolden } from "./golden-loader";

test("Reporting golden requires limitations and chunk-based evidence index", () => {
  const golden = loadGolden<{
    required_sections: string[];
    limitations_required: boolean;
    evidence_index_uses_chunk_references: boolean;
    contains_full_document_text: boolean;
  }>("golden/reporting/expected-report-summary.json");
  expect(golden.required_sections).toContain("Traceability Appendix");
  expect(golden.limitations_required).toBe(true);
  expect(golden.evidence_index_uses_chunk_references).toBe(true);
  expect(golden.contains_full_document_text).toBe(false);
});
