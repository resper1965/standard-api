import { createInMemoryKbDependencies } from "@aegis/kb";
import { createInMemoryScfCore, SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@aegis/scf-core";
import { createInMemorySoaDependencies } from "../src/index";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
  approvalId: "55555555-5555-4555-8555-555555555555",
  frameworkId: SYNTHETIC_FRAMEWORK_ID,
  scfVersionId: SYNTHETIC_SCF_VERSION_ID,
  traceId: "trace-soa-test"
};

export const context = {
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  traceId: ids.traceId
};

export const createSoaFixture = () =>
  createInMemorySoaDependencies({
    scf: createInMemoryScfCore(),
    kb: createInMemoryKbDependencies()
  });
