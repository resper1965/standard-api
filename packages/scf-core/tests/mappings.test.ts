import { createSyntheticScfFixture, validateDataset } from "../src";
import { expect, test } from "./test-kit";

test("mapping targets existing controls and requirements", () => {
  const fixture = createSyntheticScfFixture();
  const validation = validateDataset(fixture);
  expect(validation.valid).toBe(true);
});

test("duplicate control_code in same version is detected", () => {
  const fixture = createSyntheticScfFixture();
  fixture.controls.push({ ...fixture.controls[0]!, id: "20000000-0000-4000-8000-000000009999" });
  const validation = validateDataset(fixture);
  expect(validation.valid).toBe(false);
  expect(validation.errors.join(" ")).toContain("Duplicate control_code");
});
