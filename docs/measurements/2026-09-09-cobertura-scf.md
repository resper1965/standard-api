Medido em 2026-09-09 com `pnpm audit:scf`, contra
`assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx` e o bundle STRM
oficial (183 arquivos em `assets/strm/`). Reexecutado em 2026-09-10, apos a
Task 9a corrigir a classificacao de tres abas -- ver a nota no fim do
arquivo.

# Auditoria de cobertura do catalogo SCF

## Abas do workbook (10)

| Aba | Tipo |
| --- | --- |
| SCF Domains & Principles | domains |
| Authoritative Sources | authoritative_sources |
| SCF 2026.1 | controls |
| Compensating Controls 2026.1 | compensating_controls |
| Evidence Request List 2026.1 | evidence_requests |
| Assessment Objectives 2026.1 | assessment_objectives |
| Data Privacy Mgmt Principles | dpmp |
| Threat Catalog | threat_catalog |
| Risk Catalog | risk_catalog |
| Lists | metadata |

## Cobertura STRM

- FDIs no indice `Authoritative Sources`: 250
- Arquivos `.xlsx` em `assets/strm`: 183
- FDIs sem arquivo STRM correspondente: 67

FDIs sem STRM:

- general-nist-800-53-r4
- general-shared-assessments-sig-2025
- emea-eu-eba-ict-srm-2025
- emea-us-psd2-2015
- emea-aut-fappd-2000
- emea-bel-act-8-1992
- emea-deu-fdpa-2017
- emea-deu-bsrit-2017
- emea-deu-c5-2020
- emea-grc-pirppd-1997
- emea-hun-isdfi-2011
- emea-irl-dpa-2003
- emea-isr-cmo-1-0
- emea-isr-ppl-5741-1981
- emea-ita-pdpc-2003
- emea-ken-pda-2019
- emea-nga-dpr-2019
- emea-nor-pda-2018
- emea-pol-act-29-1997
- emea-qat-pdppl-2020
- emea-rus-federal-law-27-2006
- emea-sau-cscc-1-2019
- emea-sau-ecc-1-2018
- emea-sau-otcc-1-2022
- emea-sau-sacs-002-2022
- emea-sau-sama-csf-1-2017
- emea-srb-act-9-2018
- emea-zaf-popia-2013
- emea-esp-decree-1720-2007
- emea-esp-decree-311-2022
- emea-esp-ccn-stic-825-2023
- emea-che-fadp-2025
- emea-tur-lppd-2016
- emea-gbr-cap-1850-2020
- emea-gbr-cyber-essentials-requirements-3-3
- emea-gbr-dpa-1998
- apac-aus-privacy-act-1998
- apac-aus-privacy-principles-2026
- apac-aus-ism-2024-june
- apac-aus-cop-sitc-2020
- apac-aus-ps-cps-230-2023
- apac-aus-ps-cps-234-2019
- apac-chn-data-security-law-2021
- apac-chn-csnip-2012
- apac-chn-pipl-2021
- apac-hkg-pdo-2022
- apac-ind-privacy-rules-2011
- apac-jpn-ppi-2020
- apac-jpn-ismap
- apac-mys-pdpa-2010
- apac-nzl-ism-3-9
- apac-nzl-privacy-act-2020
- apac-phl-dpa-2012
- apac-sgp-pdpa-2012
- apac-sgp-cyber-hygiene-practice-2019
- apac-sgp-mas-trm-2021
- apac-kor-pipa-2011
- apac-twn-pdpa-2025
- americas-arg-ppd-2018
- americas-bhs-dpa-2003
- americas-bmu-mba-coc-2020
- americas-bra-lgpd-2018
- amaericas-can-osfi-self-assessment
- americas-can-pipeda-2000
- americas-chl-act-19628-1999
- americas-col-law-1581-2012
- americas-mex-fdpa-2010

## Banco de dados

- Secao pulada: `DATABASE_URL` nao esta setada nesta execucao.

---

## Nota sobre o codigo de saida

Esta execucao sai com **codigo 0**. Os quatro numeros de referencia continuam
batendo com a medicao manual de 2026-09-09 (10 abas, 250 FDIs, 183 arquivos,
67 sem STRM) -- a Task 9a mexeu em classificacao, nao em contagem.

## Task 9a: o bug de classificacao era triplo, nao duplo

A medicao original (2026-09-09, reproduzida acima da linha e mantida so como
historico ate aqui) mostrava duas abas -- "Compensating Controls 2026.1" e
"Data Privacy Mgmt Principles" -- caindo no bucket `metadata` junto de abas
genuinamente inertes como "Lists". Essa medicao tinha um terceiro erro
embutido nela mesma: classificava "SCF Domains & Principles" como inerte
tambem, quando essa aba e o indice de dominios que `scf_domains` deveria
consumir. O bug era triplo, e o proprio relatorio anterior era vitima do
segundo: registrava a aba de dominios como se fosse legitimamente vazia,
igual a "Lists".

A causa raiz, em `packages/scf-core/src/importers/xlsx-tab-parser.ts`:

1. `METADATA_TAB_NAMES` tinha as entradas `"scf domains"`, `"compensating
   controls"` e `"data privacy"`, casadas por `nameLower === m ||
   nameLower.startsWith(m)`. As tres abas reais comecam com esses prefixos e
   eram capturadas como metadado antes de qualquer checagem mais especifica.
2. Mesmo removendo essas entradas, as abas nao cairiam corretamente: os
   cabecalhos reais de "SCF Domains & Principles" ("SCF Domain" + "SCF
   Identifier") e de "Compensating Controls 2026.1" ("SCF Control Name" +
   "SCF Control #") batem exatamente com os indicadores de coluna que
   `classifyTab` usa para reconhecer a aba de controles -- sem uma
   interceptacao por nome anterior a essa checagem, as duas seriam
   classificadas como `controls`, uma segunda aba de controles espuria.
3. O branch dedicado a `dpmp` (`nameLower === "dpmp" ||
   nameLower.startsWith("data privacy management")`) exigia a forma por
   extenso "Data Privacy Management", mas a aba real diz "Data Privacy **Mgmt**
   Principles" -- abreviado. Alem de vir depois do bloco de metadado (que ja
   capturava a aba antes), o proprio texto do branch nunca casaria com o nome
   real. `parseDpmpTab` era codigo morto: importador, despacho e tabela de
   destino existiam, e a aba nunca chegava la.

A correcao: as tres abas passam a ser detectadas por nome **antes** de
qualquer checagem baseada em cabecalho, com os tipos `domains` e
`compensating_controls` novos na uniao de `TabClassification`, e o branch
`dpmp` casando tanto a forma abreviada real quanto a forma por extenso (para
uma edicao futura que volte a escrever por extenso). `"Lists"` continua
`metadata` -- essa e a unica das quatro que e de fato inerte.

O teste que fecha essa lacuna, `packages/scf-core/src/__tests__/audit-coverage.test.ts`,
afirma o tipo esperado de cada uma das nove abas nomeaveis por nome (exclui
"SCF 2026.1", cuja classificacao como `controls` depende dos cabecalhos da
aba de controles e nao do nome -- afirma-la exigiria cabecalhos inventados,
fragilizando o teste sem exercitar o codigo real). Uma asserção fraca --
"nenhuma aba cai em `unknown`/`crosswalk`" -- ja passava com o bug presente,
porque as tres abas nunca chegavam a esses dois tipos; eram interceptadas por
nome antes. Foi assim que o bug escapou da auditoria original.

### Observacao para a Task 9b

A reclassificacao de "Data Privacy Mgmt Principles" para `dpmp` torna
alcancavel, pela primeira vez, o branch `else if (classification.type ===
"dpmp")` em `xlsx-importer.ts`, que chama `parseDpmpTab`. Verificado nesta
tarefa (fora do escopo de codigo dela, que e so classificacao): rodar o
importador completo contra o workbook real nao lanca excecao, e
`parseDpmpTab` retorna 0 principios e 0 mapeamentos -- os nomes de coluna que
ele procura (`title`, `principle`, `dpmp_principle`, `principle_title`) nao
batem com o cabecalho real ("Principle Name" normaliza para
`principle_name`), entao toda linha e pulada por titulo vazio antes de
produzir qualquer registro. E um bug separado, pre-existente, nao introduzido
por esta tarefa -- mas agora que a aba chega ao parser, ele passa a ser
visivel e vale corrigir junto do trabalho da 9b.
