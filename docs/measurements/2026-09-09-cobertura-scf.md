Medido em 2026-09-09 com `pnpm audit:scf`, contra
`assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx` e o bundle STRM
oficial (183 arquivos em `assets/strm/`).

# Auditoria de cobertura do catalogo SCF

## Abas do workbook (10)

| Aba | Tipo |
| --- | --- |
| SCF Domains & Principles | metadata |
| Authoritative Sources | authoritative_sources |
| SCF 2026.1 | controls |
| Compensating Controls 2026.1 | metadata |
| Evidence Request List 2026.1 | evidence_requests |
| Assessment Objectives 2026.1 | assessment_objectives |
| Data Privacy Mgmt Principles | metadata |
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

Esta execucao saiu com **codigo 0**, nao 1. Os quatro numeros de referencia
batem exatamente com a medicao manual de 2026-09-09 (10 abas, 250 FDIs, 183
arquivos, 67 sem STRM), mas a porta do auditor -- aba classificada como
`unknown` ou no fallback generico `crosswalk` -- nao disparou: nenhuma das 10
abas reais desta edicao cai nesses dois tipos.

As duas abas sem parser proprio ("Compensating Controls 2026.1" e "Data
Privacy Mgmt Principles") caem em `classifyTab` no bucket `metadata`, no mesmo
lugar que abas genuinamente inertes como "Lists" e "SCF Domains &
Principles" -- porque `METADATA_TAB_NAMES`, em
`packages/scf-core/src/importers/xlsx-tab-parser.ts`, casa pelo nome da aba
antes de qualquer verificacao mais especifica (inclusive antes do branch
dedicado a `dpmp`, que portanto e hoje inalcancavel para "Data Privacy Mgmt
Principles"; nao existe branch dedicado nenhum para "Compensating Controls").
`metadata` nao esta na porta do auditor de proposito -- a porta desta tarefa e
so `unknown`/`crosswalk`, para nao reprovar por uma aba README legitimamente
vazia.

Registrado aqui, nao consertado: mexer em `xlsx-tab-parser.ts` e escopo da
Task 9.
