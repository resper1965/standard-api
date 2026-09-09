# Crosswalk STRM e cobertura do catálogo SCF — design

**Data:** 2026-09-09
**Origem:** onze achados de campo levantados por um consumidor externo entre
2026-09-08 e 2026-09-09, medidos contra `https://standard-api.bekaa.eu/api/v1`
com chave de escopo `scf:read`.
**Escopo aprovado:** defeitos de superfície da API mais o programa de cobertura
de dados. Política de contrato (estabilidade de `framework_code`, `CHANGELOG`
como quebra, onde vive a projeção por framework) está fora, registrada em §7.

---

## 1. O problema

Os onze achados não são onze problemas. São dois defeitos estruturais, cinco
defeitos locais e três perguntas de dado que o relatório classificou como
lacunas de produto sem que fossem.

### 1.1 Causa raiz A — a tabela STRM não tem versão, e a rota exige uma

`scf_strm_relationships` (`packages/schemas/src/db/scf.schema.ts`) carrega
`scf_control_id`, `fde_code`, `focal_document` e `scf_framework_id`. Não carrega
versão. Para filtrar por versão, `searchStrm`
(`packages/schemas/src/db/scf.repository.ts`) faz `leftJoin` em `scf_mappings` e
compara `scf_mappings.scf_version_id`; a rota `/scf/strm`
(`apps/api-gateway/src/routes/scf.routes.ts`) sempre preenche `scf_version_id`,
usando a versão corrente quando o cliente não passa nenhuma.

Toda linha STRM com `scf_mapping_id` nulo — a maioria, porque o vínculo com
`scf_mappings` é opcional por construção — recebe NULL do left join e é
descartada pela condição de igualdade.

Os 64 registros que o consumidor mediu em `GET /scf/strm` são exatamente as
linhas que têm vínculo de mapping. Um único controle devolve mais que isso
porque `/scf/strm/control/{code}` não faz esse join.

Daí saem **B1** (listagem devolve menos que um controle), **B10** (500/503 sob
caminhada sustentada — a caminhada de 1.468 requisições só existe porque a
listagem não funciona) e parte do **B6** (contagens divergentes).

A hipótese do relatório — escopo por `organization_id` — está errada. A coluna
existe na tabela mas nenhuma das duas rotas a usa como filtro.

### 1.2 Causa raiz B — colunas que existem e não entram no `select`

`focal_document` e `scf_framework_id` estão na linha STRM, são preenchidos pelo
seeder do bundle e têm índice (`scf_strm_framework_idx`).
`lookupStrmByControlCode` não os seleciona.

**B7** é uma linha de `select`, não uma junção nova.

### 1.3 Defeitos locais

- **B2** — `resolveVersionId` só trata o literal `"latest"`. Qualquer outro
  valor passa cru como id, então `?version=2026.1.1` chega ao Postgres como uuid
  e produz `22P02` → 500. Atinge os oito call sites de `requireVersionQuery`,
  não apenas `by-code`. O OpenAPI publicado declara `query?: never` para a rota
  que exige `version`.
- **B3** — `/scf/frameworks` ignora a query inteira e não devolve `pagination`;
  o teto de `limit` em `/scf/strm` é `max(500)` em `packages/schemas/src/scf.ts`
  e o 400 não nomeia campo nem limite.
- **B8** — `lookupStrmByControlCode` e `lookupStrmByFdeCode` aceitam apenas
  `limit`. Não há `offset`, não há `total`. Acima do teto, as linhas restantes
  são inalcançáveis, em silêncio.

### 1.4 As três perguntas de dado

- **B4** — o repositório já omite `relationship_strength` quando a origem não
  declara valor (`strengthScore?.toString() ?? undefined`). Os `0.500`
  observados são dado armazenado, não default residual.
- **B5** — `amaericas-can-osfi-self-assessment` não existe em lugar nenhum do
  repositório. É o Focal Document Identifier publicado pela própria SCF na aba
  `Authoritative Sources`. Corrigir é decisão de política, não de código.
- **B11** — tratado em §2.

---

## 2. O Anexo A da ISO 27001 já está no catálogo

Medido em 2026-09-09 lendo os arquivos do bundle em `assets/strm/`:

```
scf-strm-general-iso-27001-2022.xlsx   162 FDE únicos   prefixo "A.": 0
  1.0, 4.1, 4.2(a), 5.1(b), 6.1.2(d)(3), 10.2(b)(2) …

scf-strm-general-iso-27002-2022.xlsx   107 FDE únicos   prefixo "A.": 0
  5.1, 5.2 … 5.37, 6.1 … 6.8, 7.1 … 7.14, 8.1 … 8.34
```

O Anexo A da ISO 27001:2022 é, por definição, o conjunto de controles da ISO
27002:2022 — os quatro temas 5, 6, 7 e 8. `general-iso-27002-2022` consta dos
250 FDIs da aba `Authoritative Sources` **e** tem arquivo no bundle STRM.

O consumidor consultou `fde_code=A.5.1`. A busca é `ilike` exato
(`lookupStrmByFdeCode`), e `A.5.1` não é `5.1`. Zero linhas, com o dado presente.

**B11 não é lacuna de licenciamento nem de escopo. É lacuna de nomenclatura.**

A pergunta irmã sobre o Anexo B da ISO 27701 tem resposta análoga e diferente: o
arquivo `scf-strm-general-iso-27701-2025.xlsx` publica cláusulas
(`6.1.2(a)(1)`), não códigos `B.x` — a edição 2025 reestruturou os anexos. Não
há alias a construir ali.

---

## 3. Cobertura medida do catálogo

### 3.1 Abas do workbook

`assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx` tem 10 abas. Sete são
consumidas.

| Aba | Status |
|---|---|
| SCF 2026.1 | consumida — controles e crosswalk largo |
| Authoritative Sources | consumida — índice de 250 frameworks |
| Evidence Request List 2026.1 | consumida |
| Assessment Objectives 2026.1 | consumida |
| Data Privacy Mgmt Principles | consumida |
| Threat Catalog | consumida |
| Risk Catalog | consumida |
| **SCF Domains & Principles** | **descartada** — cai no fallback `crosswalk`, que a edição 2026.1.1 não usa |
| **Compensating Controls 2026.1** | **descartada** — `startsWith("compensating controls")` a classifica como `metadata`, e metadata é pulada |
| Lists | irrelevante — listas de validação de célula |

Os parsers `cdpas` e `mad` não têm aba correspondente nesta edição.

### 3.2 Bundle STRM

250 FDIs na aba `Authoritative Sources`, 183 arquivos em `assets/strm/`.
Descontadas as três correções de nome já mapeadas em
`BUNDLE_FILENAME_FDI_CORRECTIONS`, restam **67 frameworks com coluna de
crosswalk e nenhum arquivo STRM** — entre eles SAMA CSF, ECC saudita, POPIA,
PSD2, NIST 800-53 r4, MITRE ATT&CK e a maior parte da Europa continental.

Esses frameworks são estruturalmente `relationship_type: null` por ADR-001, que
proíbe inferir operador onde a origem não declara um. **Não é defeito.** É a
explicação dos 22% de `null` que o relatório observou e não conseguiu separar de
uma falha.

### 3.3 O que as duas abas descartadas contêm

`SCF Domains & Principles` — 33 linhas: identificador do domínio, nome,
princípio SCR, intenção do princípio, contagem e percentual de controles. A
tabela `scf_domains` já existe, com `description` vazia.

`Compensating Controls 2026.1` — uma linha por controle SCF, com aplicabilidade
PPTDF, risco caso o controle primário não seja implementado, e até N controles
compensatórios candidatos com código e justificativa. É o dado que uma
Declaração de Aplicabilidade precisa para justificar "não aplicável" ou
"controle compensatório aplicado". É um subsistema, não um ajuste — ver §6.

---

## 4. Design

### 4.1 Importador e dados

**4.1.1** `"compensating controls"` sai de `METADATA_TAB_NAMES` em
`packages/scf-core/src/importers/xlsx-tab-parser.ts` e ganha o tipo próprio
`compensating_controls`. Nesta entrega o tipo existe apenas para que a auditoria
de §4.3 possa contá-lo: não há parser e não há tabela. O ganho é a aba deixar de
ser invisível.

**4.1.2** `"SCF Domains & Principles"` ganha o tipo `domains` e um parser que
popula `scf_domains`, que já existe:

| coluna do banco | origem na aba |
|---|---|
| `domain_code` | SCF Identifier |
| `name` | SCF Domain |
| `description` | Principle Intent |
| `sort_order` | # |

Sem migração. `is_synthetic` permanece `false` — é dado oficial.

A aba traz duas colunas de texto e `scf_domains` tem uma. `description` recebe
*Principle Intent*, que é o texto mais longo e autocontido. O enunciado do
princípio SCR fica de fora nesta entrega — perda conhecida e declarada, não
esquecimento. Uma coluna `principle` é uma migração de uma linha se alguém
precisar dela; ninguém precisa hoje.

**4.1.3** `wide-crosswalk.ts` e `seed-strm-bundle.ts` não mudam. O ADR-001
permanece intocado: nenhum operador STRM é inferido, defaultado ou "estimado
conservadoramente" em qualquer ponto desta entrega.

### 4.2 Superfície da API

**4.2.1 — Filtro de versão sem descarte (B1, B10).** `searchStrm` troca o
`leftJoin` em `scf_mappings` por `leftJoin` em `scf_controls` e passa a filtrar
`scf_controls.scf_version_id`. `scf_control_id` é sempre preenchido pelo seeder
do bundle, então nenhuma linha cai; o filtro de versão continua honesto, porque
o controle é versionado; o índice `scf_strm_control_idx` já existe.

`scf_mappings` continua no plano de consulta somente quando `framework_id` ou
`source_framework_id` forem informados, que são os únicos filtros que dependem
do requisito.

**4.2.2 — Identidade do framework na linha (B7).** As três rotas STRM passam a
selecionar `focal_document`, `scf_framework_id` e, por join em `scf_frameworks`,
`framework_code`. Uma linha cujo `scf_framework_id` não resolveu devolve
`framework_code: null` — nunca um palpite, e nunca omitido em silêncio.

**4.2.3 — Paginação (B3, B8).** `/scf/strm`, `/scf/strm/control/{code}`,
`/scf/strm/lookup` e `/scf/frameworks` passam a devolver:

```json
{
  "data": [ ... ],
  "pagination": { "limit": 200, "offset": 0, "total": 326, "has_more": true },
  "trace_id": "..."
}
```

`total` vem de `count(*)` no banco, com o mesmo `where` da consulta de dados —
não do `applyPagination` de `apps/api-gateway/src/utils/pagination.ts`, que
pagina em memória e serviria mal dezenas de milhares de linhas. `offset` é
honrado. O 400 por `limit` acima do teto nomeia o campo e o valor aceito.

`count` permanece na resposta pelo tempo de vida da versão atual, com o mesmo
significado de hoje (linhas devolvidas), para não quebrar quem já lê o campo.

**4.2.4 — Streaming do crosswalk (B1, B10).** `/scf/strm` aceita
`Accept: application/x-ndjson` e transmite o resultado inteiro numa requisição,
no mesmo padrão que `/scf/controls` já usa. Uma caminhada de 1.468 requisições
ao longo de quatro horas passa a ser uma requisição — que é o que remove a causa
dos 5% de 500/503 do B10, e não só o sintoma.

**4.2.5 — Resolução de versão (B2).** `resolveVersionId` passa a resolver, nesta
ordem: o literal `latest`; um uuid existente; um número de versão publicado
(`2026.1.1`). Nada disso resolvendo, devolve 400 nomeando as três formas aceitas.
Nenhuma string não validada chega ao Postgres como uuid.

A correção é na função, não na rota: as oito rotas que chamam
`requireVersionQuery` são corrigidas de uma vez. O OpenAPI de
`/scf/controls/by-code/{code}` passa a declarar o parâmetro `version`, hoje
declarado `query?: never`.

**4.2.6 — Alias do Anexo A (B11).** `/scf/strm/lookup` aceita `fde_code` com
prefixo `A.`. A resolução é: tentativa exata primeiro; se não casar e o código
tiver a forma `A.<número>`, tenta o código sem prefixo restrito ao framework
`general-iso-27002-2022`.

A restrição ao framework é o ponto: sem ela, `A.5.1` casaria códigos `5.1` de
qualquer um dos 250 focal documents, que é a classe de erro que o relatório
descreve em B7 — um `fde_code` sozinho não identifica um requisito.

A resposta declara o que aconteceu:

```json
{
  "fde_code": "A.5.1",
  "matched_fde_code": "5.1",
  "matched_via": "iso27001_annex_a_alias",
  "framework_code": "general-iso-27002-2022",
  "pagination": { "limit": 100, "offset": 0, "total": 14, "has_more": false },
  "data": [ ... ]
}
```

`matched_via` é ausente quando o casamento foi exato. O alias nunca é silencioso.

### 4.3 Auditoria de cobertura

`scripts/audit-scf-coverage.ts`, exposto como `pnpm audit:scf`, compara o
workbook com o banco e emite relatório em `docs/measurements/`:

- toda aba do workbook passa por `classifyTab`. **Aba que resulte em `unknown`,
  ou no fallback `crosswalk` numa edição que usa crosswalk largo, reprova o
  job.** Foi por esse caminho que duas abas sumiram sem ninguém notar;
- 250 FDIs contra os arquivos do bundle, com a lista nominal dos 67 sem STRM;
- frameworks cujo `scf_framework_id` não resolveu no seeder;
- linhas STRM sem controle resolvido;
- contagens de controle, framework, requisito e mapping, comparadas com a
  execução anterior.

Job no CI. A porta é a aba desconhecida; as contagens são relatadas, não
impostas — uma edição nova legitimamente muda contagem.

`/scf/frameworks` passa a devolver, por framework, `strm_source`,
`requirements_count` e `mappings_count`. É o que permite ao consumidor separar
"este framework não tem STRM publicado" de "esta rota está quebrada" — a
pergunta por trás do B6 e dos 22% de `null`.

### 4.4 Testes

TDD, teste antes do código. Um teste por achado, nomeado pelo achado:

| Teste | Fecha |
|---|---|
| linha STRM com `scf_mapping_id` nulo sobrevive à listagem por versão | B1 |
| `framework_code` presente em 100% das linhas de `/strm/control` | B7 |
| `offset` avança o conjunto e `total` permanece estável entre páginas | B8 |
| versão inexistente devolve 400, e o corpo nomeia as formas aceitas | B2 |
| `A.5.1` casa `5.1` e a resposta declara `matched_via` e `framework_code` | B11 |
| `A.5.1` não casa `5.1` de outro focal document | B11 |
| `limit` acima do teto devolve 400 nomeando campo e limite | B3 |
| aba não classificada reprova `pnpm audit:scf` | §4.3 |
| a aba de domínios popula `scf_domains.description` | §4.1.2 |

As fixtures XLSX sintéticas de `packages/scf-core/src/fixtures` são a entrada dos
testes de importador. Nenhum dado real de cliente entra em fixture.

---

## 5. Ordem de construção

1. **4.2.5** — resolução de versão. Destrava `by-code` e mais sete rotas, e é
   independente de tudo o mais.
2. **4.2.1** — filtro de versão por `scf_controls`. É a causa raiz A.
3. **4.2.2 + 4.2.3** — identidade do framework e paginação. Mesma consulta,
   mesmo arquivo, uma passada só.
4. **4.2.4** — NDJSON.
5. **4.2.6** — alias do Anexo A. Depende de 4.2.2 para poder declarar
   `framework_code` na resposta.
6. **4.3** — auditoria e contadores em `/scf/frameworks`.
7. **4.1** — abas de domínios e de controles compensatórios.

---

## 6. Fora de escopo, dito explicitamente

- **Compensating Controls 2026.1** — dataset real, treze colunas, tabela nova.
  Merece spec próprio. Esta entrega apenas torna a lacuna visível e medida.
- **Os 67 frameworks sem STRM** — não é defeito, é o que a SCF publica. Vira
  documentação e o campo `strm_source`.
- **Framework sintético de Anexo A** — considerado e recusado. Publicar
  `general-iso-27001-2022-annex-a` seria publicar um framework que a SCF não
  publica; o alias entrega o mesmo caso de uso sem inventar catálogo.
- **Coluna `scf_version_id` em `scf_strm_relationships`** — considerada e adiada.
  O join por `scf_controls` resolve sem migração. A coluna volta à pauta se
  duas edições do bundle precisarem coexistir.

---

## 7. Questões abertas — decisão do contratante, não do implementador

1. **`framework_code` é chave pública estável entre versões de SCF?** A resposta
   à Q13 do consumidor estabeleceu o campo como parte de chave primária, e o
   valor mudou de frase para slug sem entrada no `CHANGELOG` (B9). A resposta
   decide se um consumidor deve chavear por `framework_code` ou por
   `framework_id`.
2. **O FDI `amaericas-can-osfi-self-assessment` será corrigido?** (B5) É erro da
   origem. Corrigir é quebra de chave para quem persistiu o valor; não corrigir o
   torna permanente. Precisa de resposta em qualquer direção, com ou sem alias do
   código antigo.
3. **Uma mudança de forma em campo declarado chave passa a ser tratada como
   quebra de contrato**, com entrada no `CHANGELOG` e período de convivência?
4. **Onde vive a projeção por framework?** A API oferece
   `/assessments/{id}/projection/{frameworkId}` e `/intelligence/compliance-score`
   e ao mesmo tempo serve o crosswalk cru. A política que decide o que cada tipo
   de relação contribui é onde mora o julgamento de conformidade. A posição
   precisa ser explícita porque muda o que cada consumidor constrói.
5. **Publicar quantas linhas da edição 2026.1 têm `0.500` genuíno** (B4), para
   que o campo deixe de ser indistinguível de um default histórico.
