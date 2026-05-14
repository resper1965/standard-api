import { createInMemoryScfCore, SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_GOV_DOMAIN_ID, SYNTHETIC_REQ_1_1_ID, SYNTHETIC_SCF_VERSION_ID } from "../src";
import { expect, test } from "./test-kit";

test("service lists versions and returns latest version", async () => {
  const scf = createInMemoryScfCore();
  const versions = await scf.versions.listVersions();
  const latest = await scf.versions.getLatestVersion();
  expect(versions.length).toBe(1);
  expect(latest?.id).toBe(SYNTHETIC_SCF_VERSION_ID);
});

test("service searches control by code and lists controls by domain", async () => {
  const scf = createInMemoryScfCore();
  const control = await scf.controls.getControlByCode(SYNTHETIC_SCF_VERSION_ID, "GOV-001");
  const domainControls = await scf.controls.listControlsByDomain(SYNTHETIC_SCF_VERSION_ID, SYNTHETIC_GOV_DOMAIN_ID);
  expect(control?.control_code).toBe("GOV-001");
  expect(domainControls.length).toBe(2);
});

test("service lists frameworks and requirements", async () => {
  const scf = createInMemoryScfCore();
  const frameworks = await scf.frameworks.listFrameworks();
  const requirements = await scf.frameworks.listRequirements(SYNTHETIC_FRAMEWORK_ID);
  expect(frameworks.length).toBe(1);
  expect(requirements.length).toBe(2);
});

test("service returns mappings and coverage summary", async () => {
  const scf = createInMemoryScfCore();
  const mappings = await scf.mappings.getMappingsForRequirement(SYNTHETIC_REQ_1_1_ID, SYNTHETIC_SCF_VERSION_ID);
  const coverage = await scf.mappings.getCoverageSummary(SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID);
  expect(mappings.length).toBe(1);
  expect(coverage.mapped_requirement_count).toBe(2);
  expect(coverage.official_mapping_count).toBe(2);
});
