import { expect, test } from "../../tests/test-kit";
import { loadGolden } from "./golden-loader";

test("POA&M golden requires every item to reference a gap finding", () => {
  const golden = loadGolden<{ items: Array<{ related_gap_finding_id?: string; action_type: string }> }>("golden/poam/expected-poam.json");
  expect(golden.items.every((item) => Boolean(item.related_gap_finding_id))).toBe(true);
  expect(golden.items.some((item) => item.action_type === "generic")).toBe(false);
});
