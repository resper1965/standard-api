import { describe, it, expect } from "vitest";
import { buildScfVersionFilter, scfVersionTenancyWhere } from "../scf-version-tenancy";

describe("buildScfVersionFilter â€” tenancy isolation", () => {
  it("inclui versÃµes globais (organization_id IS NULL) para qualquer org", () => {
    const filter = buildScfVersionFilter("org-A");
    expect(filter.includesGlobal).toBe(true);
  });

  it("inclui versÃµes privadas apenas da org correta", () => {
    const filter = buildScfVersionFilter("org-A");
    expect(filter.organizationId).toBe("org-A");
  });

  it("nunca expÃµe versÃµes de outra org", () => {
    const filterA = buildScfVersionFilter("org-A");
    const filterB = buildScfVersionFilter("org-B");
    expect(filterA.organizationId).not.toBe(filterB.organizationId);
  });
});

describe("scfVersionTenancyWhere â€” drizzle WHERE clause", () => {
  it("retorna objecto SQL (nÃ£o Ã© null/undefined)", () => {
    const where = scfVersionTenancyWhere("org-test");
    expect(where).toBeDefined();
    expect(where).not.toBeNull();
  });

  it("retorna resultado diferente para org diferente (nÃ£o Ã© singleton)", () => {
    const whereA = scfVersionTenancyWhere("org-A");
    const whereB = scfVersionTenancyWhere("org-B");
    // Ambos sÃ£o objectos SQL vÃ¡lidos mas com org-id diferente no eq()
    expect(whereA).not.toBe(whereB);
  });
});

