import { expect, test } from "../../tests/test-kit";
import { loadGolden } from "./golden-loader";

test("SoA golden synthetic draft keeps official mappings and validation item", () => {
  const golden = loadGolden<{ items: Array<{ mapping_type: string; applicability_status: string }> }>("golden/soa/expected-soa-draft.json");
  expect(golden.items.filter((item) => item.mapping_type === "official").length).toBe(5);
  expect(golden.items.some((item) => item.mapping_type === "none" && item.applicability_status === "requires_validation")).toBe(true);
});
