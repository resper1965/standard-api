import { describe, expect, it } from "vitest";
import { classifyTab } from "../importers/xlsx-tab-parser";

/**
 * Cobertura de classificacao das abas do workbook oficial.
 *
 * Os dez nomes abaixo sao os reais de
 * `assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx`, medidos em
 * 2026-09-09 com `pnpm audit:scf`. Afirmar so "nao caiu em unknown/crosswalk"
 * e fraco: foi exatamente assim que tres abas escaparam para o balde
 * `metadata` sem que nenhum teste percebesse -- elas nunca chegam a
 * unknown/crosswalk, sao interceptadas por nome antes. Este teste afirma o
 * tipo esperado de cada aba, uma a uma, para que uma reclassificacao futura
 * para qualquer balde errado reprove aqui.
 *
 * "SCF 2026.1" fica de fora: sua classificacao como `controls` depende das
 * colunas da aba de controles (centenas delas), nao do nome -- afirma-la
 * exigiria cabecalhos inventados, o que tornaria o teste fragil sem
 * exercitar o codigo real. `classifyTab` e chamado com `headers: []` porque
 * as nove abas restantes classificam por nome, antes de qualquer checagem de
 * cabecalho.
 */
describe("cobertura de abas do workbook 2026.1.1", () => {
  const casos: Array<[nome: string, tipoEsperado: string]> = [
    ["SCF Domains & Principles", "domains"],
    ["Authoritative Sources", "authoritative_sources"],
    ["Compensating Controls 2026.1", "compensating_controls"],
    ["Evidence Request List 2026.1", "evidence_requests"],
    ["Assessment Objectives 2026.1", "assessment_objectives"],
    ["Data Privacy Mgmt Principles", "dpmp"],
    ["Threat Catalog", "threat_catalog"],
    ["Risk Catalog", "risk_catalog"],
    ["Lists", "metadata"],
  ];

  it.each(casos)("%s classifica como %s", (nome, tipoEsperado) => {
    expect(classifyTab(nome, []).type).toBe(tipoEsperado);
  });
});
