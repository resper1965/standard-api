import { expect, test } from "../../tests/test-kit";
import { loadGolden } from "./golden-loader";

test("Maturity golden does not allow score 5 in minimum synthetic dataset", () => {
  const golden = loadGolden<{ controls: Array<{ score: number }>; max_allowed_score_without_operational_evidence: number }>("golden/maturity/expected-maturity-assessment.json");
  expect(golden.controls.some((control) => control.score > golden.max_allowed_score_without_operational_evidence)).toBe(false);
  expect(golden.controls.some((control) => control.score === 5)).toBe(false);
});
