import { expect, test } from "../../tests/test-kit";
import { loadGolden } from "./golden-loader";

test("Gap golden preserves not_evidenced and conflicting statuses", () => {
  const golden = loadGolden<{ findings: Array<{ assessment_status: string; evidence_status: string }> }>("golden/gap-analysis/expected-gap-analysis.json");
  expect(golden.findings.some((finding) => finding.evidence_status === "not_evidenced" && finding.assessment_status === "not_evidenced")).toBe(true);
  expect(golden.findings.some((finding) => finding.evidence_status === "conflicting" && finding.assessment_status === "requires_validation")).toBe(true);
});
