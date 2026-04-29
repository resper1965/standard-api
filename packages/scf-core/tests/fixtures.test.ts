import { createSyntheticScfFixture, SYNTHETIC_SCF_VERSION_ID } from "../src";
import { expect, test } from "./test-kit";

test("synthetic fixture creates a marked SCF dataset", () => {
  const fixture = createSyntheticScfFixture();
  expect(fixture.versions.length).toBe(1);
  expect(fixture.domains.length).toBe(2);
  expect(fixture.controls.length).toBe(4);
  expect(fixture.frameworks.length).toBe(1);
  expect(fixture.requirements.length).toBe(2);
  expect(fixture.mappings.length).toBe(2);
  expect(fixture.versions[0]!.id).toBe(SYNTHETIC_SCF_VERSION_ID);
  expect(fixture.versions[0]!.is_synthetic).toBe(true);
});

test("synthetic fixture has no tenant identifiers in official SCF records", () => {
  const fixture = createSyntheticScfFixture();
  const serialized = JSON.stringify(fixture);
  expect(serialized.includes("tenant_id")).toBe(false);
});
