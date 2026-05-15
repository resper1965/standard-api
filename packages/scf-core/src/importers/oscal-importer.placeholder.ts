import type { ScfImporter } from "./scf-importer";

/**
 * OSCAL JSON SCF Importer — deferred to Phase 4.
 *
 * OSCAL (Open Security Controls Assessment Language) is an official
 * NIST-backed JSON/XML format for security controls. This importer
 * will parse OSCAL catalog/profile outputs when the SCF project
 * provides official OSCAL exports.
 *
 * Status: Intentionally deferred — XLSX importer covers 100% of
 * current SCF data needs. OSCAL support adds compliance value
 * but is not a functional blocker.
 */
export const createOscalScfImporter = (): ScfImporter => ({
  sourceType: "oscal_json",
  validate: async () => ({
    valid: false,
    errors: ["OSCAL JSON import is deferred to Phase 4. Use the XLSX importer for SCF data ingestion."],
    warnings: [],
  }),
  parse: async () => {
    throw new Error(
      "OSCAL JSON importer is deferred to Phase 4. " +
      "The XLSX importer provides complete SCF data coverage. " +
      "See: https://pages.nist.gov/OSCAL/"
    );
  },
});
