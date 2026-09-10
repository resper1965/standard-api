import { describe, expect, it } from "vitest";
import { compararCobertura } from "../../../../scripts/audit-scf-coverage";

describe("compararCobertura", () => {
  it("nomeia os FDIs sem arquivo STRM correspondente", () => {
    const r = compararCobertura({
      fdis: ["general-iso-27002-2022", "emea-sau-ecc-1-2018"],
      arquivosBundle: ["scf-strm-general-iso-27002-2022.xlsx"],
    });
    expect(r.semStrm).toEqual(["emea-sau-ecc-1-2018"]);
    expect(r.semFdi).toEqual([]);
  });

  it("aplica as correcoes de nome de arquivo do bundle", () => {
    // scf-dpmp-2025 e um dos tres arquivos cujo nome nao bate com o FDI;
    // BUNDLE_FILENAME_FDI_CORRECTIONS o mapeia para general-scf-dpmp-2025.
    // Nome real no bundle (confirmado em assets/strm/): tem o prefixo
    // "scf-strm-" que fdiFromBundleFilename exige de todo arquivo do bundle.
    const r = compararCobertura({
      fdis: ["general-scf-dpmp-2025"],
      arquivosBundle: ["scf-strm-scf-dpmp-2025.xlsx"],
    });
    expect(r.semStrm).toEqual([]);
  });

  it("nomeia arquivo de bundle que nenhum FDI reclama", () => {
    const r = compararCobertura({
      fdis: [],
      arquivosBundle: ["scf-strm-general-iso-27002-2022.xlsx"],
    });
    expect(r.semFdi).toEqual(["general-iso-27002-2022"]);
  });
});
