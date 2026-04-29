import type { ScfImporter } from "./scf-importer";

export const createXlsxScfImporter = (): ScfImporter => ({
  sourceType: "xlsx",
  validate: async () => ({
    valid: false,
    errors: ["XLSX SCF importer is defined as an extension point but is not implemented in this MVP."],
    warnings: []
  }),
  parse: async () => {
    throw new Error("XLSX SCF importer is not implemented in this MVP.");
  }
});
