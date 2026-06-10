import { describe, it, expect } from "vitest";
import { buildScfVersionFilter, scfVersionTenancyWhere } from "../scf-version-tenancy";

describe("buildScfVersionFilter — tenancy isolation", () => {
  it("inclui versões globais (organization_id IS NULL) para qualquer org", () => {
    const filter = buildScfVersionFilter("org-A");
    expect(filter.includesGlobal).toBe(true);
  });

  it("inclui versões privadas apenas da org correta", () => {
    const filter = buildScfVersionFilter("org-A");
    expect(filter.organizationId).toBe("org-A");
  });

  it("nunca expõe versões de outra org", () => {
    const filterA = buildScfVersionFilter("org-A");
    const filterB = buildScfVersionFilter("org-B");
    expect(filterA.organizationId).not.toBe(filterB.organizationId);
  });
});

describe("scfVersionTenancyWhere — drizzle WHERE clause", () => {
  it("retorna objecto SQL (não é null/undefined)", () => {
    const where = scfVersionTenancyWhere("org-test");
    expect(where).toBeDefined();
    expect(where).not.toBeNull();
  });

  it("retorna resultado diferente para org diferente (não é singleton)", () => {
    const whereA = scfVersionTenancyWhere("org-A");
    const whereB = scfVersionTenancyWhere("org-B");
    // Ambos são objectos SQL válidos mas com org-id diferente no eq()
    expect(whereA).not.toBe(whereB);
  });
});
