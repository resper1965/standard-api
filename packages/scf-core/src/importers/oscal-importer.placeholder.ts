import type { ScfImporter } from "./scf-importer";

export const createOscalScfImporter = (): ScfImporter => ({
  sourceType: "oscal_json",
  validate: async () => ({
    valid: false,
    errors: ["OSCAL JSON SCF importer is reserved for future official structured sources."],
    warnings: []
  }),
  parse: async () => {
    throw new Error("OSCAL JSON SCF importer is not implemented in this MVP.");
  }
});
