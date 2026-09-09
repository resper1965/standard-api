# Crosswalk STRM e cobertura do catálogo SCF — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o crosswalk STRM ser consumível por um cliente externo — listagem
que devolve o catálogo inteiro, identidade de framework em cada linha, paginação
honesta e resolução de versão que não vira 500 — e tornar a cobertura do catálogo
SCF mensurável a cada import.

**Architecture:** As correções de leitura vivem em duas camadas: o repositório
Drizzle (`packages/schemas/src/db/scf.repository.ts`), que constrói as consultas,
e as rotas (`apps/api-gateway/src/routes/scf.routes.ts`), que montam a resposta.
Nenhuma migração de banco: as colunas necessárias já existem e estão indexadas. A
auditoria de cobertura é um script novo que lê o workbook e o banco e reprova o CI
quando uma aba do workbook deixa de ter parser.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, Postgres (PGlite nos testes),
ExcelJS, Vitest via `tests/test-kit.ts`, pnpm workspaces.

**Spec:** [`docs/superpowers/specs/2026-09-09-scf-crosswalk-cobertura-design.md`](../specs/2026-09-09-scf-crosswalk-cobertura-design.md)

## Global Constraints

- **ADR-001 é inviolável.** Nenhum operador STRM é inferido, defaultado ou
  "estimado conservadoramente" em nenhum ponto. `relationship_type: null`
  significa que a origem não declara operador e permanece null.
- **Código em inglês; comentários, docs e mensagens de commit em português.**
- **Conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`.
- **TDD:** o teste falha antes de existir implementação. Sem exceção.
- **Nenhum dado real de cliente** em fixture, teste ou exemplo.
- **Sem migração de banco neste plano.** Toda coluna usada já existe. Uma tarefa
  que pareça exigir migração está mal entendida — pare e releia a spec.
- **`snake_case` sem acento** em nome de objeto e coluna; colunas técnicas com
  prefixo `_`.
- **Commits terminam com** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  (AGENTS.md §84).
- **Matchers disponíveis** em `apps/api-gateway/tests/test-kit.ts`: `toBe`,
  `toEqual`, `toBeDefined`, `toBeUndefined`, `toBeLessThan`,
  `toBeGreaterThanOrEqual`, `toContain`, `toThrow`. Não existe `toMatchObject`
  nem `toHaveLength` — usar `.length` com `toBe`.
- **Rodar um teste isolado:** `npx vitest run <arquivo> -t "<nome>"`. O
  `test-kit` delega ao vitest quando `VITEST` está setado, e `vitest.config.ts`
  já inclui `apps/*/tests/**/*.test.ts`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefas |
|---|---|---|
| `apps/api-gateway/src/routes/scf.routes.ts` | Resolução de versão, montagem das respostas STRM, streaming NDJSON, alias do Anexo A | 1, 3, 4, 5, 6, 8 |
| `packages/schemas/src/db/scf.repository.ts` | Consultas Drizzle: joins, filtros, `count(*)`, alvo do upsert | 2, 3, 4, 6, 8, 9 |
| `packages/scf-core/src/repositories/scf.repository.ts` | Repositório em memória e a interface que as duas implementações cumprem | 2, 3, 4, 6, 8 |
| `packages/schemas/src/scf.ts` | Schemas Zod de consulta e resposta | 3, 4 |
| `packages/scf-core/src/fixtures/synthetic-scf.fixture.ts` | Linhas sintéticas que o repositório em memória serve | 3, 6 |
| `packages/scf-core/src/importers/xlsx-tab-parser.ts` | Classificação de abas do workbook | 9 |
| `packages/scf-core/src/importers/scf-domains.ts` *(novo)* | Parser da aba `SCF Domains & Principles` | 9 |
| `packages/scf-core/src/importers/xlsx-importer.ts` | Despacho por tipo de aba | 9 |
| `scripts/audit-scf-coverage.ts` *(novo)* | Auditoria workbook ↔ banco | 7 |
| `apps/api-gateway/tests/scf.test.ts` | Testes de rota com repositório em memória | 1 |
| `apps/api-gateway/tests/scf-strm-crosswalk.test.ts` *(novo)* | Regressões contra Postgres real (PGlite) — B1, B7, B8, B3, B10, B11, B6 e o re-import | 2, 3, 4, 5, 6, 8, 9 |
| `apps/api-gateway/tests/helpers.ts` | `sendRaw`, para ler corpo NDJSON sem parsear | 5 |
| `apps/api-gateway/tests/run-tests.ts` | Registro do arquivo de teste novo no runner | 2 |
| `packages/scf-core/src/__tests__/audit-scf-coverage.test.ts` *(novo)* | Comparacao FDI x bundle, funcao pura | 7 |
| `packages/scf-core/src/__tests__/audit-coverage.test.ts` *(novo)* | Toda aba do workbook tem parser proprio | 9 |
| `packages/scf-core/src/__tests__/scf-domains.test.ts` *(novo)* | Parser da aba de domínios | 9 |

**Corte natural de PR:** tarefas 1–6 são a superfície da API e podem sair num PR;
7–9 são importador e auditoria e podem sair noutro. Cada metade é software
funcionando por conta própria.

---

### Task 1: Resolução de versão que nunca vira 500

Fecha **B2**. `resolveVersionId` só trata o literal `"latest"`; qualquer outro
valor é devolvido cru e chega ao Postgres como uuid, produzindo `22P02` → 500.
Corrigir na função conserta as oito rotas que chamam `requireVersionQuery` de uma
vez.

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts:37-49`
- Test: `apps/api-gateway/tests/scf.test.ts`

**Interfaces:**
- Consumes: `deps.scf.versions.listVersions(organizationId?)` e
  `deps.scf.versions.getLatestVersion(organizationId?)`, ambos já existentes em
  `packages/scf-core/src/services/scf-version.service.ts`. `ScfVersion` tem o
  campo `version: string` (o rótulo, ex. `"2026.1.1"`) e `id: string` (uuid).
- Produces: `resolveVersionId(deps, versionParam, organizationId?) => Promise<string>`,
  mesma assinatura de hoje. Passa a lançar `ApiError("VALIDATION_ERROR", …, 400)`
  para rótulo desconhecido.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `apps/api-gateway/tests/scf.test.ts`:

```ts
test("B2: versao desconhecida devolve 400 e nomeia as formas aceitas", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/scf/controls/by-code/GOV-001?version=9999.9.9",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );
  expect(result.response.status).toBe(400);
  expect(result.body.error.code).toBe("VALIDATION_ERROR");
  expect(result.body.error.message).toContain("latest");
});

test("B2: rotulo de versao publicado resolve para o id", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/by-code/GOV-001?version=${SYNTHETIC_SCF_VERSION_LABEL}`,
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );
  expect(result.response.status).toBe(200);
  expect(result.body.control_code).toBe("GOV-001");
  expect(result.body.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
});
```

Acrescentar `SYNTHETIC_SCF_VERSION_LABEL` ao import de `@standard/scf-core` na
primeira linha do arquivo.

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run apps/api-gateway/tests/scf.test.ts -t "B2:"
```

Esperado: os dois FAIL. O primeiro recebe 500 em vez de 400; o segundo recebe 404
ou 500, porque o rótulo é devolvido cru como se fosse um id.

- [ ] **Step 3: Implementar**

Em `apps/api-gateway/src/routes/scf.routes.ts`, substituir a função
`resolveVersionId` (linha 37) por:

```ts
/** Forma RFC 4122. Guarda as colunas uuid de receberem um rótulo de versão. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resolveVersionId = async (
  deps: AppDependencies,
  versionParam: string,
  organizationId?: string,
): Promise<string> => {
  if (versionParam === "latest") {
    const latest = await deps.scf.versions.getLatestVersion(organizationId);
    if (!latest)
      throw new ApiError("NOT_FOUND", "No published SCF versions found.", 404);
    return latest.id;
  }

  // Um uuid segue para o repositório; se não existir, o chamador devolve 404,
  // que é o comportamento de hoje e permanece.
  if (UUID_RE.test(versionParam)) return versionParam;

  // Um rótulo como "2026.1.1". Resolvê-lo aqui é o que impede uma string não
  // validada de chegar a uma coluna uuid e transformar 22P02 em 500.
  // O campo do tipo de dominio e version_label, NAO version: mapVersion em
  // packages/schemas/src/db/scf.repository.ts mapeia a coluna `version` do
  // banco para `version_label`, e ScfVersionSchema declara version_label.
  const versions = await deps.scf.versions.listVersions(organizationId);
  const match = versions.find((v) => v.version_label === versionParam);
  if (match) return match.id;

  throw new ApiError(
    "VALIDATION_ERROR",
    `Unknown SCF version: "${versionParam}". Accepted forms: "latest", a version id (uuid), or a published version label such as "2026.1.1".`,
    400,
  );
};
```

- [ ] **Step 4: Rodar e confirmar que passam**

```bash
npx vitest run apps/api-gateway/tests/scf.test.ts -t "B2:"
```

Esperado: PASS nos dois.

- [ ] **Step 5: Rodar a suíte inteira da rota, porque a função tem oito chamadores**

```bash
npx vitest run apps/api-gateway/tests/scf.test.ts
```

Esperado: todos PASS. Se algum teste antigo passava um id inexistente e esperava
404, ele continua recebendo 404 — o ramo `UUID_RE` preserva isso.

- [ ] **Step 6: Declarar o parâmetro no OpenAPI**

O contrato publicado declara `query?: never` para
`/api/v1/scf/controls/by-code/{controlCode}`, e a rota exige `version`. Localizar
a definição:

```bash
grep -rn "by-code" apps/api-gateway/src/openapi/
```

Acrescentar o parâmetro de query `version` (string, obrigatório) à operação, com a
descrição: `"latest", a version id (uuid), or a published version label (e.g. 2026.1.1)."`

- [ ] **Step 7: Regenerar e conferir o contrato**

```bash
pnpm generate:openapi && pnpm check:openapi
```

Esperado: sem diferenças pendentes.

- [ ] **Step 8: Commit**

```bash
git add apps/api-gateway/src/routes/scf.routes.ts apps/api-gateway/tests/scf.test.ts apps/api-gateway/src/openapi public/
git commit -F - <<'EOF'
fix(scf): resolver rotulo de versao em vez de mandar string crua ao banco

resolveVersionId so tratava o literal "latest" e devolvia qualquer outro valor
sem validar. Um rotulo como "2026.1.1" chegava ao Postgres como uuid e virava
22P02, que a API publicava como 500.

Passa a resolver, nesta ordem: "latest", um uuid, um rotulo publicado. Nada
disso resolvendo, 400 nomeando as formas aceitas.

A correcao e na funcao, entao alcanca as oito rotas que usam
requireVersionQuery, nao so controls/by-code. O OpenAPI passa a declarar o
parametro version, hoje declarado query?: never.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Filtro de versão sem descartar linha

Fecha **B1** e remove a causa de **B10**. `searchStrm` alcança a versão por
`leftJoin` em `scf_mappings`; toda linha STRM com `scf_mapping_id` nulo recebe
NULL do join e some. A versão vive no controle, não no mapping.

**Files:**
- Modify: `packages/schemas/src/db/scf.repository.ts` — função `searchStrm`
- Create: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`
- Modify: `apps/api-gateway/tests/run-tests.ts` — importar o arquivo novo

**Interfaces:**
- Consumes: `createDrizzleTestClient()` de `apps/api-gateway/tests/helpers.ts`,
  que devolve `{ send, db }` sobre PGlite com as migrações reais aplicadas.
- Produces: `searchStrm(query: ScfStrmQuery) => Promise<ScfStrmRelationship[]>`,
  assinatura inalterada. O comportamento muda: linhas sem `scf_mapping_id`
  passam a ser devolvidas.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`:

```ts
/**
 * Regressões do crosswalk STRM medidas contra Postgres real (PGlite).
 *
 * O repositório em memória de scf-core não filtra por versão e não faz join
 * nenhum, então um teste de B1 contra ele passaria sem provar nada. Estes
 * testes existem para exercitar o SQL.
 */
import { createDrizzleTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";
import * as schema from "@standard/schemas/db/schema";

const VERSION_ID = "30000000-0000-4000-8000-000000000001";
const DOMAIN_ID = "30000000-0000-4000-8000-000000000002";
const CONTROL_ID = "30000000-0000-4000-8000-000000000003";
const FRAMEWORK_ID = "30000000-0000-4000-8000-000000000004";

/** Semeia uma versão com um controle, um framework e N linhas STRM sem mapping. */
const seedCrosswalk = async (db: any, strmRowCount: number) => {
  await db.insert(schema.scfVersions).values({
    id: VERSION_ID,
    version: "test-crosswalk-1.0",
  });
  await db.insert(schema.scfDomains).values({
    id: DOMAIN_ID,
    scfVersionId: VERSION_ID,
    domainCode: "GOV",
    name: "Governance",
  });
  await db.insert(schema.scfControls).values({
    id: CONTROL_ID,
    scfVersionId: VERSION_ID,
    scfDomainId: DOMAIN_ID,
    controlCode: "GOV-01",
    title: "Security Program",
  });
  await db.insert(schema.scfFrameworks).values({
    id: FRAMEWORK_ID,
    scfVersionId: VERSION_ID,
    frameworkId: "general-iso-27002-2022",
    name: "ISO 27002:2022",
  });

  // scf_mapping_id deliberadamente ausente: é a forma da maioria das linhas do
  // bundle oficial, e é exatamente a linha que o join antigo descartava.
  await db.insert(schema.scfStrmRelationships).values(
    Array.from({ length: strmRowCount }, (_, i) => ({
      scfControlId: CONTROL_ID,
      scfFrameworkId: FRAMEWORK_ID,
      focalDocument: "scf-strm-general-iso-27002-2022.xlsx",
      fdeCode: `5.${i + 1}`,
      fdeName: `Control 5.${i + 1}`,
      relationshipType: "subset" as const,
      strengthScore: "0.500",
      source: "test_bundle",
    })),
  );
};

test("B1: linha STRM sem scf_mapping_id sobrevive ao filtro de versao", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 12);

  const result = await send(
    `/api/v1/scf/strm?scf_version_id=${VERSION_ID}&limit=100`,
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.response.status).toBe(200);
  expect(result.body.data.length).toBe(12);
});
```

Registrar o arquivo em `apps/api-gateway/tests/run-tests.ts`, logo após a linha
`import "./scf.test";`:

```ts
import "./scf-strm-crosswalk.test"; // regressoes B1/B7/B8 do crosswalk STRM
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B1:"
```

Esperado: FAIL com `Expected 0 to be 12` — nenhuma das doze linhas sobrevive ao
join em `scf_mappings`.

- [ ] **Step 3: Implementar**

Em `packages/schemas/src/db/scf.repository.ts`, dentro de `searchStrm`,
substituir o bloco que começa em `if (query.framework_id || query.source_framework_id || query.scf_version_id) {`
por:

```ts
    // A versão vive no controle, não na linha STRM e não no mapping. Alcançá-la
    // por scf_mappings descartava toda linha com scf_mapping_id nulo — que é a
    // maior parte do bundle oficial, e é por isso que esta rota devolvia 64
    // linhas para um catálogo de dezenas de milhares.
    //
    // innerJoin e deliberado: uma linha sem controle resolvido não pode ser
    // atribuída a uma versão. A auditoria de cobertura conta essas linhas.
    if (query.scf_version_id) {
      dbQuery = dbQuery.innerJoin(
        scfControls,
        eq(scfControls.id, scfStrmRelationships.scfControlId),
      );
      conditions.push(eq(scfControls.scfVersionId, query.scf_version_id));
    }

    // scf_mappings só entra quando o filtro pedido depende do requisito.
    if (query.framework_id || query.source_framework_id) {
      dbQuery = dbQuery
        .leftJoin(
          scfMappings,
          eq(scfMappings.id, scfStrmRelationships.scfMappingId),
        )
        .leftJoin(
          scfFrameworkRequirements,
          eq(
            scfFrameworkRequirements.id,
            scfMappings.scfFrameworkRequirementId,
          ),
        );

      if (query.framework_id) {
        conditions.push(
          eq(scfFrameworkRequirements.scfFrameworkId, query.framework_id),
        );
      }
      if (query.source_framework_id) {
        conditions.push(
          eq(
            scfFrameworkRequirements.scfFrameworkId,
            query.source_framework_id,
          ),
        );
      }
    }
```

`scfControls` já está importado neste arquivo (usado em `getControlByCode`).

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B1:"
```

Esperado: PASS.

- [ ] **Step 5: Rodar a suíte de rota inteira**

```bash
npx vitest run apps/api-gateway/tests/
```

Esperado: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas/src/db/scf.repository.ts apps/api-gateway/tests/scf-strm-crosswalk.test.ts apps/api-gateway/tests/run-tests.ts
git commit -F - <<'EOF'
fix(scf): filtrar STRM por versao do controle, nao pelo mapping

searchStrm alcancava a versao por leftJoin em scf_mappings e comparava
scf_mappings.scf_version_id. Toda linha STRM com scf_mapping_id nulo recebia
NULL do join e era descartada pela igualdade -- e o vinculo com scf_mappings e
opcional por construcao, entao a maior parte do bundle sumia.

Era a causa de GET /scf/strm devolver 64 linhas enquanto um unico controle
devolvia 326. Passa a juntar por scf_controls, onde a versao de fato vive.
scf_mappings so entra quando framework_id ou source_framework_id sao pedidos.

Sem migracao: a coluna scf_control_id ja existe e ja tem indice.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Identidade do framework em cada linha STRM

Fecha **B7**. `focal_document` e `scf_framework_id` estão na linha e são
indexados; nenhuma das três rotas os seleciona. Um `fde_code` sozinho não
identifica um requisito — dois focal documents publicam "AC-1".

**Files:**
- Modify: `packages/schemas/src/scf.ts` — `ScfStrmRelationshipSchema`
- Modify: `packages/schemas/src/db/scf.repository.ts` — `searchStrm`,
  `lookupStrmByFdeCode`, `lookupStrmByControlCode`
- Modify: `packages/scf-core/src/repositories/scf.repository.ts` — repositório em memória
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` — mapeamento de resposta das três rotas
- Modify: `packages/scf-core/src/fixtures/synthetic-scf.fixture.ts`
- Test: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`

**Interfaces:**
- Consumes: `seedCrosswalk(db, n)` da Task 2, que já grava `scfFrameworkId` e
  `focalDocument`.
- Produces: cada linha das três rotas STRM passa a carregar `framework_code`,
  `framework_name`, `scf_framework_id` e `focal_document`. `framework_code` é
  `null` quando o framework não resolveu — nunca omitido em silêncio.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`:

```ts
test("B7: rota por controle devolve framework_code em toda linha", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 5);

  const result = await send(
    "/api/v1/scf/strm/control/GOV-01?limit=100",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.response.status).toBe(200);
  expect(result.body.data.length).toBe(5);

  const semFramework = result.body.data.filter(
    (r: any) => r.framework_code === undefined,
  );
  expect(semFramework.length).toBe(0);
  expect(result.body.data[0].framework_code).toBe("general-iso-27002-2022");
  expect(result.body.data[0].focal_document).toBe(
    "scf-strm-general-iso-27002-2022.xlsx",
  );
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B7:"
```

Esperado: FAIL — `framework_code` é `undefined` em todas as cinco linhas.

- [ ] **Step 3: Estender o schema Zod**

Em `packages/schemas/src/scf.ts`, dentro de `ScfStrmRelationshipSchema`, depois do
campo `scf_control_id`, acrescentar:

```ts
  /** Arquivo do bundle de onde a linha veio — um por framework. Parte da chave
   *  única da migração 0060. null nas linhas anteriores ao seeder do bundle. */
  focal_document: z.string().nullable().optional(),
  /** Framework que o focal document resolveu, por match exato. null = não
   *  resolvido, e uma linha não resolvida não gradua mapeamento nenhum. */
  scf_framework_id: UuidSchema.nullable().optional(),
```

`ScfStrmRelationshipResponseSchema` já declara `framework_code` e
`framework_name` — nada a fazer lá.

- [ ] **Step 4: Selecionar as colunas no repositório Drizzle**

Em `packages/schemas/src/db/scf.repository.ts`, nas três funções `searchStrm`,
`lookupStrmByFdeCode` e `lookupStrmByControlCode`, acrescentar ao objeto de
`.select({...})`:

```ts
        focalDocument: scfStrmRelationships.focalDocument,
        scfFrameworkId: scfStrmRelationships.scfFrameworkId,
        frameworkCode: scfFrameworks.frameworkId,
        frameworkName: scfFrameworks.name,
```

E, nas três, acrescentar o join — `leftJoin` porque uma linha com framework não
resolvido deve voltar mesmo assim, com `framework_code: null`:

```ts
      .leftJoin(
        scfFrameworks,
        eq(scfFrameworks.id, scfStrmRelationships.scfFrameworkId),
      )
```

Em `searchStrm` o join entra logo após `.from(scfStrmRelationships).$dynamic()`,
antes dos joins condicionais. Nas outras duas, após `.from(scfStrmRelationships)`.

Nos três `rows.map(...)`, acrescentar ao objeto devolvido:

```ts
      focal_document: row.focalDocument ?? null,
      scf_framework_id: row.scfFrameworkId ?? null,
      framework_code: row.frameworkCode ?? null,
      framework_name: row.frameworkName ?? null,
```

Conferir que `scfFrameworks` está no import do topo do arquivo; se não estiver,
acrescentá-lo.

- [ ] **Step 5: Espelhar no repositório em memória**

Em `packages/scf-core/src/repositories/scf.repository.ts`, as três funções STRM
devolvem as linhas da fixture direto. Como a fixture passa a carregar os campos
novos (Step 6), nada muda nas funções — apenas confirmar que elas não fazem
`pick` de campos. Se fizerem, incluir os quatro campos novos.

- [ ] **Step 6: Dar identidade às linhas da fixture**

Em `packages/scf-core/src/fixtures/synthetic-scf.fixture.ts`, nas duas entradas de
`strmRelationships`, acrescentar:

```ts
      focal_document: "synthetic-fixture.xlsx",
      scf_framework_id: SYNTHETIC_FRAMEWORK_ID,
```

`SYNTHETIC_FRAMEWORK_ID` já é importado neste arquivo.

- [ ] **Step 7: Devolver os campos na resposta das rotas**

Em `apps/api-gateway/src/routes/scf.routes.ts`, nos `data = rows.map(...)` de
`/scf/strm/lookup` (≈linha 1489) e `/scf/strm/control/:control_code` (≈linha
1565), acrescentar a cada objeto:

```ts
        focal_document: r.focal_document ?? null,
        scf_framework_id: r.scf_framework_id ?? null,
        framework_code: r.framework_code ?? null,
        framework_name: r.framework_name ?? null,
```

`/scf/strm` devolve as linhas do repositório sem remapear, então já as carrega.

- [ ] **Step 8: Rodar e confirmar que passa**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B7:"
npx vitest run apps/api-gateway/tests/
```

Esperado: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/schemas/src/scf.ts packages/schemas/src/db/scf.repository.ts packages/scf-core/src/repositories/scf.repository.ts packages/scf-core/src/fixtures/synthetic-scf.fixture.ts apps/api-gateway/src/routes/scf.routes.ts apps/api-gateway/tests/scf-strm-crosswalk.test.ts
git commit -F - <<'EOF'
fix(scf): expor framework e focal document nas rotas STRM

focal_document e scf_framework_id existem na linha desde a migracao 0060 e tem
indice, e nenhuma das tres rotas STRM os selecionava. Sem eles a rota por
controle e inutilizavel para mapeamento: um fde_code sozinho nao identifica um
requisito, porque dois focal documents publicam "AC-1".

O join em scf_frameworks e leftJoin de proposito -- uma linha cujo framework
nao resolveu volta com framework_code null, nunca omitida em silencio.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Paginação honesta

Fecha **B3** e **B8**. `offset` é ignorado nas rotas de lookup, não há `total`, e
`count == limit` é indistinguível de "há mais". `/scf/frameworks` ignora a query
inteira.

**Files:**
- Modify: `packages/schemas/src/scf.ts` — `ScfStrmQuerySchema`
- Modify: `packages/schemas/src/db/scf.repository.ts` — as três funções STRM e `listFrameworks`
- Modify: `packages/scf-core/src/repositories/scf.repository.ts` — interface e implementação em memória
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` — quatro rotas
- Test: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`

**Interfaces:**
- Produces: as três funções STRM passam a aceitar `opts.offset?: number` e a
  devolver `{ rows, total }` em vez de um array. A interface em
  `packages/scf-core/src/repositories/scf.repository.ts:89-100` muda:

```ts
  /** Página de linhas mais a contagem total sob o mesmo filtro. */
  lookupStrmByFdeCode(
    fdeCode: string,
    opts?: { relationshipType?: string; limit?: number; offset?: number },
  ): Promise<{ rows: ScfStrmRelationship[]; total: number }>;
  lookupStrmByControlCode(
    controlCode: string,
    opts?: { relationshipType?: string; limit?: number; offset?: number },
  ): Promise<{ rows: ScfStrmRelationship[]; total: number }>;
  searchStrm(
    query: import("@standard/schemas").ScfStrmQuery,
  ): Promise<{ rows: ScfStrmRelationship[]; total: number }>;
```

  Forma de resposta das quatro rotas:

```json
{
  "data": [],
  "count": 0,
  "pagination": { "limit": 100, "offset": 0, "total": 0, "has_more": false },
  "trace_id": "..."
}
```

  `count` permanece com o significado de hoje — linhas devolvidas — para não
  quebrar quem já o lê.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`:

```ts
test("B8: offset avanca o conjunto e total permanece estavel", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 30);
  const headers = { "x-standard-actor-id": ids.actorId };

  const page1 = await send(
    "/api/v1/scf/strm/control/GOV-01?limit=10&offset=0",
    "GET",
    undefined,
    headers,
  );
  const page2 = await send(
    "/api/v1/scf/strm/control/GOV-01?limit=10&offset=10",
    "GET",
    undefined,
    headers,
  );

  expect(page1.body.pagination.total).toBe(30);
  expect(page2.body.pagination.total).toBe(30);
  expect(page1.body.data.length).toBe(10);
  expect(page2.body.data.length).toBe(10);
  expect(page1.body.pagination.has_more).toBe(true);

  const ids1 = page1.body.data.map((r: any) => r.strm_id).sort().join(",");
  const ids2 = page2.body.data.map((r: any) => r.strm_id).sort().join(",");
  expect(ids1 === ids2).toBe(false);
});

test("B8: ultima pagina marca has_more false", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 30);

  const result = await send(
    "/api/v1/scf/strm/control/GOV-01?limit=10&offset=20",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.body.pagination.has_more).toBe(false);
  expect(result.body.data.length).toBe(10);
});

test("B3: limit acima do teto devolve 400 nomeando campo e limite", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 3);

  const result = await send(
    `/api/v1/scf/strm?scf_version_id=${VERSION_ID}&limit=1000`,
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.response.status).toBe(400);
  expect(result.body.error.message).toContain("limit");
  expect(result.body.error.message).toContain("500");
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B8:"
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B3:"
```

Esperado: FAIL. `pagination` é `undefined`; as duas páginas devolvem as mesmas 10
linhas; o 400 do `limit` traz `"Request validation failed."`, sem nomear nada.

- [ ] **Step 3: Contagem e offset no repositório Drizzle**

Em `packages/schemas/src/db/scf.repository.ts`, para cada uma das três funções
STRM: montar o array `conditions` uma vez, usá-lo nas duas consultas, e devolver
`{ rows, total }`. Padrão, mostrado para `lookupStrmByControlCode`:

```ts
  lookupStrmByControlCode: async (controlCode, opts) => {
    const control = await db
      .select({ id: scfControls.id })
      .from(scfControls)
      .where(ilike(scfControls.controlCode, controlCode.trim()))
      .limit(1);

    if (!control.length) return { rows: [], total: 0 };

    const conditions = [
      eq(scfStrmRelationships.scfControlId, control[0]!.id),
      ...(opts?.relationshipType
        ? [
            eq(
              scfStrmRelationships.relationshipType,
              opts.relationshipType as
                | "equal"
                | "subset"
                | "intersects"
                | "superset"
                | "no_relation",
            ),
          ]
        : []),
    ];

    // A contagem usa exatamente o mesmo where da consulta de dados. Um total
    // derivado de outro filtro e pior que nenhum total.
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(scfStrmRelationships)
      .where(and(...conditions));

    const rows = await db
      .select({
        id: scfStrmRelationships.id,
        scfMappingId: scfStrmRelationships.scfMappingId,
        scfControlId: scfStrmRelationships.scfControlId,
        fdeCode: scfStrmRelationships.fdeCode,
        fdeName: scfStrmRelationships.fdeName,
        relationshipType: scfStrmRelationships.relationshipType,
        strengthScore: scfStrmRelationships.strengthScore,
        rationale: scfStrmRelationships.rationale,
        source: scfStrmRelationships.source,
        organizationId: scfStrmRelationships.organizationId,
        focalDocument: scfStrmRelationships.focalDocument,
        scfFrameworkId: scfStrmRelationships.scfFrameworkId,
        frameworkCode: scfFrameworks.frameworkId,
        frameworkName: scfFrameworks.name,
      })
      .from(scfStrmRelationships)
      .leftJoin(
        scfFrameworks,
        eq(scfFrameworks.id, scfStrmRelationships.scfFrameworkId),
      )
      .where(and(...conditions))
      .orderBy(asc(scfStrmRelationships.fdeCode), asc(scfStrmRelationships.id))
      .limit(opts?.limit ?? 100)
      .offset(opts?.offset ?? 0);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        scf_mapping_id: row.scfMappingId ?? undefined,
        scf_control_id: row.scfControlId ?? undefined,
        fde_code: row.fdeCode ?? undefined,
        fde_name: row.fdeName ?? undefined,
        relationship_type: row.relationshipType,
        relationship_strength: row.strengthScore?.toString() ?? undefined,
        rationale: row.rationale ?? undefined,
        source: row.source,
        organization_id: row.organizationId ?? undefined,
        focal_document: row.focalDocument ?? null,
        scf_framework_id: row.scfFrameworkId ?? null,
        framework_code: row.frameworkCode ?? null,
        framework_name: row.frameworkName ?? null,
      })),
      total: Number(total),
    };
  },
```

`relationship_strength` continua saindo por `?? undefined`, e não `?? null`: é a
omissão que o campo já tem hoje quando a origem não declara valor, e o relatório
de campo registrou essa omissão como correta. Não trocar por `null`.

O `orderBy` não é cosmético: sem ordem estável, `offset` devolve linhas
arbitrárias entre páginas. `count` e `asc` vêm de `drizzle-orm`; conferir o
import do topo.

Aplicar o mesmo padrão em `lookupStrmByFdeCode` e `searchStrm`. Em `searchStrm`,
a consulta de contagem precisa repetir os mesmos joins condicionais da consulta
de dados — extrair a montagem de joins para uma função local dentro de
`searchStrm` e chamá-la nas duas.

- [ ] **Step 4: Espelhar no repositório em memória**

Em `packages/scf-core/src/repositories/scf.repository.ts`, as três funções passam
a devolver `{ rows, total }`, com `total` sendo o tamanho do conjunto **antes** do
fatiamento:

```ts
    lookupStrmByControlCode: async (controlCode, opts) => {
      const code = controlCode.trim().toLowerCase();
      let results = [...strmRelationships.values()].filter(
        (r) => (r.scf_control_id ?? "").toLowerCase() === code,
      );
      if (opts?.relationshipType)
        results = results.filter(
          (r) => r.relationship_type === opts.relationshipType,
        );
      const offset = opts?.offset ?? 0;
      return {
        rows: results.slice(offset, offset + (opts?.limit ?? 100)),
        total: results.length,
      };
    },
```

Atualizar também a interface nas linhas 89-100 conforme o bloco **Interfaces**
acima.

- [ ] **Step 5: Elevar o teto e nomear o limite**

Em `packages/schemas/src/scf.ts`, `ScfStrmQuerySchema`, trocar a linha do `limit`
por uma que nomeie o teto na mensagem:

```ts
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(500, { message: "limit must be between 1 and 500." })
    .default(100),
```

Conferir se o handler de erro de validação propaga a mensagem do Zod para o corpo
do 400. Se não propagar, capturar o `ZodError` no handler de `/scf/strm` e
relançar como `ApiError("VALIDATION_ERROR", <mensagem do primeiro issue>, 400)`.

- [ ] **Step 6: Montar `pagination` nas quatro rotas**

Em `apps/api-gateway/src/routes/scf.routes.ts`:

Nas rotas `/scf/strm`, `/scf/strm/lookup` e `/scf/strm/control/:control_code`,
ler o `offset`, passá-lo adiante, e montar a resposta:

```ts
      const offsetRaw = url.searchParams.get("offset");
      const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0;

      const { rows, total } = await deps.scf.repository.lookupStrmByControlCode(
        controlCode,
        { limit, offset, ...(relationshipType ? { relationshipType } : {}) },
      );
```

e, no `json({...})`:

```ts
        count: data.length,
        pagination: {
          limit,
          offset,
          total,
          has_more: offset + data.length < total,
        },
```

Em `/scf/frameworks` (linha ≈646), que hoje ignora a query inteira:

```ts
    handler: async ({ deps, request, traceId }) => {
      const url = new URL(request.url);
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 250, 500) : 250;
      const offsetRaw = url.searchParams.get("offset");
      const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0;

      const frameworks = await deps.scf.frameworks.listFrameworks();
      const page = frameworks.slice(offset, offset + limit);

      return json({
        data: page.map(frameworkResponse),
        count: page.length,
        pagination: {
          limit,
          offset,
          total: frameworks.length,
          has_more: offset + page.length < frameworks.length,
        },
        trace_id: traceId,
      });
    },
```

O catálogo tem 250 frameworks e cabe em memória; paginar aqui é fatiar, não uma
consulta nova. O default de 250 preserva a resposta de hoje para quem não passa
`limit`.

- [ ] **Step 7: Rodar e confirmar que passam**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts
npx vitest run apps/api-gateway/tests/
```

Esperado: todos PASS. Corrigir os chamadores que quebrarem por causa da mudança
de `ScfStrmRelationship[]` para `{ rows, total }` — procurá-los com:

```bash
grep -rn "lookupStrmByControlCode\|lookupStrmByFdeCode\|searchStrm" --include=*.ts apps packages | grep -v __tests__
```

- [ ] **Step 8: Atualizar o OpenAPI**

Em `apps/api-gateway/src/openapi/response-schemas.ts`, a nota da linha ≈153 diz
que `/scf/frameworks` ignora `limit` e `offset`. Substituí-la pela descrição da
paginação nova, e declarar `pagination` nas respostas das três rotas STRM.

```bash
pnpm generate:openapi && pnpm check:openapi
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat(scf): paginacao com total nas rotas STRM e em frameworks

As rotas de lookup aceitavam limit e ignoravam offset, e nao devolviam total.
Um controle com 326 relacoes respondia 100 sem dizer que cortou, e acima do
teto de limit nao havia caminho para o resto. /scf/frameworks ignorava a query
inteira e devolvia o catalogo sem pagination.

As tres rotas STRM passam a devolver pagination{limit, offset, total,
has_more}, com total vindo de count(*) sob o mesmo where da consulta de dados,
e ordem estavel por (fde_code, id) -- sem ela, offset devolve linhas
arbitrarias entre paginas. count permanece com o significado de hoje.

O 400 por limit acima do teto passa a nomear o campo e o valor aceito.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Streaming NDJSON do crosswalk

Remove a causa de **B10**. Uma caminhada de 1.468 requisições ao longo de quatro
horas vira uma requisição. `/scf/controls` já tem o padrão.

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` — rota `/scf/strm`
- Test: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`

**Interfaces:**
- Consumes: `searchStrm({...})` devolvendo `{ rows, total }` (Task 4).
- Produces: `GET /scf/strm` com `Accept: application/x-ndjson` responde
  `200` com `Content-Type: application/x-ndjson`, uma linha JSON por relação, e
  header `X-Standard-Stream: strm`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
test("B10: /scf/strm transmite o crosswalk inteiro em NDJSON", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 120);

  const result = await send(
    `/api/v1/scf/strm?scf_version_id=${VERSION_ID}`,
    "GET",
    undefined,
    {
      "x-standard-actor-id": ids.actorId,
      Accept: "application/x-ndjson",
    },
  );

  expect(result.response.status).toBe(200);
  expect(result.response.headers.get("Content-Type")).toContain(
    "application/x-ndjson",
  );

  const linhas = result.text.trim().split("\n").filter(Boolean);
  expect(linhas.length).toBe(120);

  const primeira = JSON.parse(linhas[0]);
  expect(primeira.framework_code).toBe("general-iso-27002-2022");
  expect(primeira._error).toBeUndefined();
});
```

O helper `send` faz `response.json()` e falharia num corpo NDJSON. Acrescentar em
`apps/api-gateway/tests/helpers.ts`, dentro de `createDrizzleTestClient`, um
`sendRaw` que devolve `{ response, text }` sem parsear, e exportá-lo junto com
`send` e `db`:

```ts
  const sendRaw = async (
    path: string,
    method = "GET",
    headers: Record<string, string> = {},
  ) => {
    const response = await app.fetch(jsonRequest(path, method, undefined, headers));
    return { response, text: await response.text() };
  };
```

O teste então usa `sendRaw` e lê `result.text`.

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B10:"
```

Esperado: FAIL — a resposta é JSON, com `Content-Type: application/json`.

- [ ] **Step 3: Implementar**

Em `apps/api-gateway/src/routes/scf.routes.ts`, dentro do handler de `/scf/strm`,
logo após `const query = ScfStrmQuerySchema.parse(rawQuery);`, inserir:

```ts
      const acceptHeader = request.headers.get("Accept") ?? "";
      if (acceptHeader.includes("application/x-ndjson")) {
        const { readable, writable } = new TransformStream<
          Uint8Array,
          Uint8Array
        >();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const batchSize = 500;

        // Transmite em segundo plano — não aguardar, a resposta volta já.
        (async () => {
          try {
            let offset = 0;
            for (;;) {
              const { rows, total } = await deps.scf.repository.searchStrm({
                ...query,
                limit: batchSize,
                offset,
              });
              for (const row of rows) {
                await writer.write(
                  encoder.encode(JSON.stringify(row) + "\n"),
                );
              }
              offset += rows.length;
              if (rows.length === 0 || offset >= total) break;
            }
          } catch (err: any) {
            try {
              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    _error: true,
                    message: err?.message ?? "Stream error",
                    trace_id: traceId,
                  }) + "\n",
                ),
              );
            } catch {
              // writer pode já estar fechado — ignorar
            }
          } finally {
            try {
              await writer.close();
            } catch {
              // já fechado — ignorar
            }
          }
        })();

        return new Response(readable, {
          status: 200,
          headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked",
            "X-Standard-Stream": "strm",
            "X-Standard-Trace-Id": traceId ?? "",
          },
        });
      }
```

A condição de parada usa `total`, não um lote curto: o `searchStrm` desta base
devolve exatamente `limit` linhas quando há mais, então comparar o tamanho do
lote com `batchSize` repetiria o defeito que o comentário em `/scf/controls`
documenta.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B10:"
npx vitest run apps/api-gateway/tests/
```

- [ ] **Step 5: Documentar no OpenAPI**

Declarar a variante NDJSON de `/scf/strm` em
`apps/api-gateway/src/openapi/response-schemas.ts`, no mesmo formato da nota já
existente para `/scf/controls`, e regenerar:

```bash
pnpm generate:openapi && pnpm check:openapi
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat(scf): transmitir o crosswalk STRM em NDJSON

Sem listagem funcional, a unica forma de obter o crosswalk era caminhar
controle a controle: cerca de 1.468 requisicoes em quatro horas, com 5% de
500/503 transitorios pelo caminho. Uma requisicao no lugar de 1.468 remove a
causa, nao o sintoma.

Mesmo padrao de /scf/controls. A condicao de parada usa o total e nao o
tamanho do lote, porque searchStrm devolve exatamente limit linhas quando ha
mais -- comparar com batchSize e o defeito que o comentario da rota irma
documenta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Alias do Anexo A da ISO 27001

Fecha **B11**. O Anexo A já está no catálogo como `general-iso-27002-2022`, com os
códigos sem o prefixo `A.`. Uma SoA é indexada por `A.5.1`.

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` — rota `/scf/strm/lookup`
- Modify: `packages/scf-core/src/repositories/scf.repository.ts` — interface e implementação em memória
- Modify: `packages/schemas/src/db/scf.repository.ts` — `lookupStrmByFdeCode`
- Test: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`

**Interfaces:**
- Produces: `lookupStrmByFdeCode` ganha `opts.frameworkCode?: string`, que
  restringe a busca a um framework por `scf_frameworks.framework_id`. A rota
  devolve `matched_fde_code` e `matched_via` quando o casamento não foi exato.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const ANEXO_A_ALIAS = "iso27001_annex_a_alias";

test("B11: A.5.1 casa 5.1 na ISO 27002 e declara o alias", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 3); // gera fde_code 5.1, 5.2, 5.3

  const result = await send(
    "/api/v1/scf/strm/lookup?fde_code=A.5.1",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.response.status).toBe(200);
  expect(result.body.data.length).toBe(1);
  expect(result.body.fde_code).toBe("A.5.1");
  expect(result.body.matched_fde_code).toBe("5.1");
  expect(result.body.matched_via).toBe(ANEXO_A_ALIAS);
  expect(result.body.data[0].framework_code).toBe("general-iso-27002-2022");
});

test("B11: casamento exato nao declara alias", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 3);

  const result = await send(
    "/api/v1/scf/strm/lookup?fde_code=5.1",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.body.data.length).toBe(1);
  expect(result.body.matched_via).toBeUndefined();
});

test("B11: alias nao alcanca 5.1 de outro focal document", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 3);

  // Um segundo framework publicando o mesmo codigo "5.1".
  const OUTRO_FW = "30000000-0000-4000-8000-000000000005";
  await db.insert(schema.scfFrameworks).values({
    id: OUTRO_FW,
    scfVersionId: VERSION_ID,
    frameworkId: "general-nist-csf-2-0",
    name: "NIST CSF 2.0",
  });
  await db.insert(schema.scfStrmRelationships).values({
    scfControlId: CONTROL_ID,
    scfFrameworkId: OUTRO_FW,
    focalDocument: "scf-strm-general-nist-csf-2-0.xlsx",
    fdeCode: "5.1",
    fdeName: "Outro 5.1",
    relationshipType: "intersects" as const,
    source: "test_bundle",
  });

  const result = await send(
    "/api/v1/scf/strm/lookup?fde_code=A.5.1",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  expect(result.body.data.length).toBe(1);
  expect(result.body.data[0].framework_code).toBe("general-iso-27002-2022");
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B11:"
```

Esperado: o primeiro e o terceiro FAIL com zero linhas; o segundo passa por
acidente e é a guarda de não-regressão.

- [ ] **Step 3: Aceitar o filtro por framework no repositório**

Em `packages/schemas/src/db/scf.repository.ts`, `lookupStrmByFdeCode`, acrescentar
ao array `conditions`:

```ts
      ...(opts?.frameworkCode
        ? [eq(scfFrameworks.frameworkId, opts.frameworkCode)]
        : []),
```

O join em `scfFrameworks` já existe desde a Task 3. A consulta de contagem da
Task 4 precisa do mesmo join quando `frameworkCode` for passado — replicá-lo lá.

Espelhar em `packages/scf-core/src/repositories/scf.repository.ts`:

```ts
      if (opts?.frameworkCode)
        results = results.filter(
          (r) => r.framework_code === opts.frameworkCode,
        );
```

E acrescentar `frameworkCode?: string` à assinatura de `lookupStrmByFdeCode` na
interface.

- [ ] **Step 4: Implementar o alias na rota**

Em `apps/api-gateway/src/routes/scf.routes.ts`, no handler de `/scf/strm/lookup`,
depois da validação de `fdeCode` e antes da chamada ao repositório:

```ts
      /**
       * O Anexo A da ISO 27001:2022 é, por definição, o conjunto de controles da
       * ISO 27002:2022 — os temas 5/6/7/8. A SCF publica esses códigos sem o
       * prefixo "A.", sob o focal document general-iso-27002-2022, e uma
       * Declaração de Aplicabilidade é indexada por "A.5.1".
       *
       * A restrição ao framework é o ponto: sem ela, "A.5.1" casaria o código
       * "5.1" de qualquer um dos 250 focal documents.
       */
      const ANNEX_A_FRAMEWORK_CODE = "general-iso-27002-2022";
      const ANNEX_A_PATTERN = /^A\.(\d.*)$/i;
```

Substituir a chamada única ao repositório por: tentativa exata, e só então o
alias.

```ts
      let matchedFdeCode = fdeCode;
      let matchedVia: string | undefined;

      let { rows, total } = await deps.scf.repository.lookupStrmByFdeCode(
        fdeCode,
        { limit, offset, ...(relationshipType ? { relationshipType } : {}) },
      );

      if (rows.length === 0) {
        const annexMatch = ANNEX_A_PATTERN.exec(fdeCode.trim());
        if (annexMatch) {
          const semPrefixo = annexMatch[1]!;
          const aliased = await deps.scf.repository.lookupStrmByFdeCode(
            semPrefixo,
            {
              limit,
              offset,
              frameworkCode: ANNEX_A_FRAMEWORK_CODE,
              ...(relationshipType ? { relationshipType } : {}),
            },
          );
          if (aliased.rows.length > 0) {
            rows = aliased.rows;
            total = aliased.total;
            matchedFdeCode = semPrefixo;
            matchedVia = "iso27001_annex_a_alias";
          }
        }
      }
```

E no `json({...})` final:

```ts
        fde_code: fdeCode,
        ...(matchedVia
          ? { matched_fde_code: matchedFdeCode, matched_via: matchedVia }
          : {}),
```

- [ ] **Step 5: Rodar e confirmar que passam**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B11:"
npx vitest run apps/api-gateway/tests/
```

- [ ] **Step 6: Documentar a equivalência**

Em `apps/api-gateway/src/openapi/response-schemas.ts`, na descrição de
`/scf/strm/lookup`, acrescentar:

> O Anexo A da ISO 27001:2022 é publicado pela SCF como
> `general-iso-27002-2022`, com os códigos sem o prefixo `A.` (`A.5.1` → `5.1`,
> `A.8.34` → `8.34`). Um `fde_code` com o prefixo é resolvido contra esse focal
> document e a resposta declara `matched_fde_code` e `matched_via`.

```bash
pnpm generate:openapi && pnpm check:openapi
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat(scf): resolver codigos do Anexo A da ISO 27001 no lookup STRM

O Anexo A da ISO 27001:2022 e o conjunto de controles da ISO 27002:2022, e a
SCF ja publica esse crosswalk como general-iso-27002-2022 -- 107 codigos
cobrindo os temas 5/6/7/8, sem o prefixo "A.". Um consumidor consultando
A.5.1, que e como uma Declaracao de Aplicabilidade indexa, recebia zero linhas
com o dado presente.

O lookup passa a tentar o casamento exato primeiro e, so entao, o codigo sem
prefixo restrito ao framework da 27002. A restricao ao framework e essencial:
sem ela A.5.1 casaria o "5.1" de qualquer um dos 250 focal documents.

A resposta declara matched_fde_code e matched_via -- o alias nunca e
silencioso.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Auditoria de cobertura do catálogo

Torna repetível a medição que hoje é manual: sete de dez abas consumidas, 250
FDIs contra 183 arquivos STRM.

**Files:**
- Create: `scripts/audit-scf-coverage.ts`
- Create: `packages/scf-core/src/__tests__/audit-scf-coverage.test.ts`
- Modify: `package.json` — script `audit:scf`
- Create: `docs/measurements/2026-09-09-cobertura-scf.md` (saída da primeira execução)

**Interfaces:**
- Consumes: `classifyTab(sheetName, headers)` e `getSheetHeaders(sheet)` de
  `packages/scf-core/src/importers/xlsx-tab-parser.ts`;
  `parseAuthoritativeSources(rows)` de
  `packages/scf-core/src/importers/authoritative-sources.ts`;
  `fdiFromBundleFilename(filename)` de `packages/schemas/src/strm-focal-document.ts`.
- Produces: processo com código de saída 1 quando alguma aba do workbook cair em
  `unknown` ou no fallback `crosswalk`; 0 caso contrário. Relatório em markdown no
  stdout.

- [ ] **Step 1: Escrever o teste que falha**

A comparacao FDI-contra-bundle e a unica logica do script que merece teste
proprio: o resto e leitura de arquivo e impressao. Extrai-la como funcao pura
torna o script testavel sem abrir o workbook.

Criar `packages/scf-core/src/__tests__/audit-scf-coverage.test.ts`:

```ts
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
    const r = compararCobertura({
      fdis: ["general-scf-dpmp-2025"],
      arquivosBundle: ["scf-dpmp-2025.xlsx"],
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run packages/scf-core/src/__tests__/audit-scf-coverage.test.ts
```

Esperado: FAIL — o modulo `scripts/audit-scf-coverage` nao existe.

- [ ] **Step 3: Escrever o script de auditoria**

Criar `scripts/audit-scf-coverage.ts`. Estrutura, com os pontos de decisão
explícitos:

```ts
#!/usr/bin/env tsx
/**
 * Auditoria de cobertura do catálogo SCF.
 *
 * Compara o workbook oficial com o que o importador consome e com o bundle
 * STRM. A porta é a aba desconhecida: uma edição nova que traga uma aba sem
 * parser reprova aqui em vez de sumir em silêncio, que foi como as abas de
 * domínios e de controles compensatórios ficaram dois meses sem ser lidas.
 *
 * As contagens são relatadas, nunca impostas — uma edição nova legitimamente
 * muda contagem.
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { classifyTab } from "../packages/scf-core/src/importers/xlsx-tab-parser.js";
import { parseAuthoritativeSources } from "../packages/scf-core/src/importers/authoritative-sources.js";
import { fdiFromBundleFilename } from "../packages/schemas/src/strm-focal-document.js";

const WORKBOOK = "assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx";
const BUNDLE_DIR = "assets/strm";

/**
 * Compara o indice de FDIs do workbook com os arquivos do bundle STRM.
 *
 * Funcao pura e exportada para ser testavel sem abrir o workbook -- e a unica
 * logica do script; o resto e leitura de arquivo e impressao.
 */
export const compararCobertura = (entrada: {
  fdis: string[];
  arquivosBundle: string[];
}): { semStrm: string[]; semFdi: string[] } => {
  const fdis = entrada.fdis.map((f) => f.toLowerCase());
  const doBundle = entrada.arquivosBundle
    .map((f) => fdiFromBundleFilename(f)?.toLowerCase())
    .filter((f): f is string => Boolean(f));

  const conjuntoBundle = new Set(doBundle);
  const conjuntoFdis = new Set(fdis);

  return {
    semStrm: fdis.filter((f) => !conjuntoBundle.has(f)),
    semFdi: doBundle.filter((b) => !conjuntoFdis.has(b)),
  };
};

const texto = (v: unknown): string =
  v == null
    ? ""
    : String((v as any).text ?? (v as any).result ?? v)
        .replace(/\s+/g, " ")
        .trim();

/**
 * Lê cada aba como matriz de strings.
 *
 * Usa o leitor em streaming e não `Workbook().xlsx.load()`: o load falha
 * nestes arquivos com "Cannot read properties of undefined (reading
 * 'comments')" — o mesmo motivo pelo qual strm-bundle-importer.ts usa o
 * WorkbookReader.
 */
const lerAbas = async (
  caminho: string,
): Promise<Array<{ nome: string; linhas: string[][] }>> => {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(
    Readable.from(fs.readFileSync(caminho)),
    { worksheets: "emit", sharedStrings: "cache" },
  );
  const abas: Array<{ nome: string; linhas: string[][] }> = [];
  for await (const ws of reader) {
    const linhas: string[][] = [];
    for await (const row of ws) {
      // Só o cabeçalho importa para classificar; a aba de Authoritative
      // Sources é a única lida inteira, e tem 251 linhas.
      if (linhas.length < 400) {
        linhas.push((row.values as unknown[]).slice(1).map(texto));
      }
    }
    abas.push({ nome: ws.name, linhas });
  }
  return abas;
};

const main = async () => {
  const abas = await lerAbas(WORKBOOK);
  const classificadas = abas.map((a) => ({
    nome: a.nome,
    // classifyTab recebe os cabeçalhos da primeira linha, que é o que
    // getSheetHeaders extrai de um Worksheet carregado.
    tipo: classifyTab(a.nome, a.linhas[0] ?? []).type,
  }));
  const semParser = classificadas.filter(
    (c) => c.tipo === "unknown" || c.tipo === "crosswalk",
  );

  const abaFontes = abas.find((a) =>
    a.nome.toLowerCase().includes("authoritative"),
  );
  if (!abaFontes) {
    console.error("FALHA: aba Authoritative Sources ausente do workbook.");
    process.exit(1);
  }
  const fdis = parseAuthoritativeSources(abaFontes.linhas).sources.map((s) =>
    s.fdi.toLowerCase(),
  );
  const bundle = new Set(
    fs
      .readdirSync(BUNDLE_DIR)
      .filter((f) => f.endsWith(".xlsx"))
      .map((f) => fdiFromBundleFilename(f)?.toLowerCase())
      .filter(Boolean) as string[],
  );
  const semStrm = fdis.filter((f) => !bundle.has(f));

  // ... imprimir relatório markdown ...

  if (semParser.length > 0) {
    console.error(
      `\nFALHA: ${semParser.length} aba(s) do workbook sem parser proprio: ` +
        semParser.map((s) => `"${s.nome}"`).join(", "),
    );
    process.exit(1);
  }
};

await main();
```

O relatório imprime, nesta ordem: tabela de abas com tipo; total de FDIs,
arquivos de bundle e a lista nominal dos FDIs sem STRM; contagens vindas do banco
quando `DATABASE_URL` estiver setada (frameworks com `scf_framework_id` nulo,
linhas STRM sem controle resolvido, totais de controle/framework/requisito) e uma
nota de que a seção foi pulada quando não estiver.

- [ ] **Step 4: Registrar o script no `package.json`**

```json
    "audit:scf": "tsx scripts/audit-scf-coverage.ts",
```

- [ ] **Step 5: Rodar e conferir a saída**

```bash
pnpm audit:scf
```

Esperado, antes da Task 9: sai com código 1 e nomeia as duas abas. Conferir que
os números batem com a medição de 2026-09-09 — 10 abas, 250 FDIs, 183 arquivos,
67 sem STRM. Divergência aqui significa erro no script, não no catálogo.

- [ ] **Step 6: Gravar a primeira medição**

Redirecionar o relatório para `docs/measurements/2026-09-09-cobertura-scf.md` e
acrescentar um cabeçalho de duas linhas dizendo quando foi medido e contra qual
edição.

A fiacao ao CI NAO acontece aqui: enquanto as duas abas descartadas nao tiverem
parser, `pnpm audit:scf` sai com codigo 1 de proposito, e ligar isso ao CI agora
deixaria a branch vermelha ate a Task 9. A Task 9 liga, como ultimo passo, depois
de classificar as abas.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -F - <<'EOF'
ci(scf): auditar a cobertura do catalogo a cada execucao

A medicao que revelou duas abas descartadas e 67 frameworks sem STRM foi
manual e nao sobreviveria ao proximo import. Passa a ser pnpm audit:scf,
comparando o workbook com o bundle e com o banco.

A porta e a aba desconhecida: uma edicao nova que traga aba sem parser reprova
em vez de sumir em silencio. Contagens sao relatadas, nunca impostas -- uma
edicao nova legitimamente muda contagem.

O teste de cobertura de abas falha de proposito ate a tarefa que da parser as
duas abas descartadas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Contadores por framework

Permite ao consumidor separar "este framework não tem STRM publicado" de "esta
rota está quebrada" — a pergunta por trás de **B6** e dos 22% de `null`.

**Files:**
- Modify: `packages/schemas/src/db/scf.repository.ts` — `listFrameworks`
- Modify: `packages/scf-core/src/repositories/scf.repository.ts`
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` — `frameworkResponse`
- Test: `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`

**Interfaces:**
- Produces: cada item de `GET /scf/frameworks` ganha `strm_source: string | null`
  (o `source` das linhas STRM daquele framework, ou `null` quando não há
  nenhuma), `requirements_count: number` e `mappings_count: number`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
test("B6: frameworks declaram se tem STRM publicado", async () => {
  const { send, db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 4);

  // Um framework de coluna de crosswalk, sem nenhuma linha STRM -- e o caso
  // dos 67 que a SCF publica sem arquivo de bundle.
  await db.insert(schema.scfFrameworks).values({
    id: "30000000-0000-4000-8000-000000000006",
    scfVersionId: VERSION_ID,
    frameworkId: "emea-sau-ecc-1-2018",
    name: "Saudi Arabia ECC-1:2018",
  });

  const result = await send("/api/v1/scf/frameworks", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
  });

  const comStrm = result.body.data.find(
    (f: any) => f.framework_code === "general-iso-27002-2022",
  );
  const semStrm = result.body.data.find(
    (f: any) => f.framework_code === "emea-sau-ecc-1-2018",
  );

  expect(comStrm.strm_source).toBe("test_bundle");
  expect(semStrm.strm_source).toBe(null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B6:"
```

Esperado: FAIL — `strm_source` é `undefined` nos dois.

- [ ] **Step 3: Implementar**

Em `packages/schemas/src/db/scf.repository.ts`, `listFrameworks` passa a agregar
em uma consulta, com `leftJoin` para que framework sem linha STRM apareça com
`null`:

```ts
  listFrameworks: async () => {
    const rows = await db
      .select({
        framework: scfFrameworks,
        strmSource: sql<string | null>`max(${scfStrmRelationships.source})`,
        strmCount: count(scfStrmRelationships.id),
      })
      .from(scfFrameworks)
      .leftJoin(
        scfStrmRelationships,
        eq(scfStrmRelationships.scfFrameworkId, scfFrameworks.id),
      )
      .groupBy(scfFrameworks.id)
      .orderBy(asc(scfFrameworks.frameworkId));

    return rows.map((r) => ({
      ...mapFramework(r.framework),
      strm_source: r.strmSource ?? null,
      strm_count: Number(r.strmCount),
    }));
  },
```

`requirements_count` e `mappings_count` vêm de duas consultas agregadas
separadas, unidas em memória. Um único `groupBy` com três `leftJoin` produz o
produto cartesiano das três tabelas e infla as contagens — é o erro clássico
deste formato de consulta:

```ts
    const reqCounts = await db
      .select({
        frameworkId: scfFrameworkRequirements.scfFrameworkId,
        total: count(scfFrameworkRequirements.id),
      })
      .from(scfFrameworkRequirements)
      .groupBy(scfFrameworkRequirements.scfFrameworkId);

    const mapCounts = await db
      .select({
        frameworkId: scfMappings.scfFrameworkId,
        total: count(scfMappings.id),
      })
      .from(scfMappings)
      .groupBy(scfMappings.scfFrameworkId);

    const porFramework = (
      linhas: Array<{ frameworkId: string | null; total: number }>,
    ) =>
      new Map(
        linhas
          .filter((l) => l.frameworkId != null)
          .map((l) => [l.frameworkId!, Number(l.total)]),
      );

    const reqPorFw = porFramework(reqCounts);
    const mapPorFw = porFramework(mapCounts);
```

e, no `rows.map(...)` de `listFrameworks`:

```ts
      requirements_count: reqPorFw.get(r.framework.id) ?? 0,
      mappings_count: mapPorFw.get(r.framework.id) ?? 0,
```

Em `apps/api-gateway/src/routes/scf.routes.ts`, `frameworkResponse` passa a
incluir os três campos.

Espelhar em `packages/scf-core/src/repositories/scf.repository.ts` contando sobre
os mapas em memória.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run apps/api-gateway/tests/scf-strm-crosswalk.test.ts -t "B6:"
npx vitest run apps/api-gateway/tests/
```

- [ ] **Step 5: Documentar e commitar**

```bash
pnpm generate:openapi && pnpm check:openapi
git add -A
git commit -F - <<'EOF'
feat(scf): declarar cobertura STRM por framework

250 frameworks tem coluna de crosswalk e 183 tem arquivo no bundle STRM. Os 67
restantes sao estruturalmente relationship_type null por ADR-001, e do lado do
consumidor isso era indistinguivel de rota quebrada.

/scf/frameworks passa a devolver strm_source, requirements_count e
mappings_count. strm_source null diz "a SCF nao publica STRM para este
framework" -- que e a resposta a pergunta por tras dos 22% de null.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Abas descartadas e alvo do upsert de frameworks

Fecha o teste da Task 7 e corrige o defeito latente encontrado ao responder §7.1
da spec.

**Files:**
- Modify: `packages/scf-core/src/importers/xlsx-tab-parser.ts`
- Create: `packages/scf-core/src/importers/scf-domains.ts`
- Modify: `packages/scf-core/src/importers/xlsx-importer.ts`
- Modify: `packages/schemas/src/db/scf.repository.ts` — upsert de `scfFrameworks`
- Create: `packages/scf-core/src/__tests__/audit-coverage.test.ts`
- Create: `packages/scf-core/src/__tests__/scf-domains.test.ts`
- Modify: `package.json` — `pnpm audit:scf` entra no encadeamento `test:ci`

**Interfaces:**
- Produces: `classifyTab` ganha os tipos `domains` e `compensating_controls`.
  `parseDomainsTab(rows: string[][], versionId: string) => { domains: ScfDomain[]; warnings: string[] }`.

- [ ] **Step 1: Escrever o teste do parser de domínios**

Criar `packages/scf-core/src/__tests__/scf-domains.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseDomainsTab } from "../importers/scf-domains";

describe("parseDomainsTab", () => {
  // Cabeçalho real da aba `SCF Domains & Principles` da edição 2026.1.1.
  const header = [
    "#",
    "SCF Domain",
    "SCF Identifier",
    "Security, Compliance & Resilience (SCR) Principles",
    "Principle Intent",
    "Control Count",
    "Control %",
  ];

  it("mapeia identificador, nome e intencao do principio", () => {
    const { domains } = parseDomainsTab(
      [
        header,
        [
          "1",
          "Cybersecurity & Data Protection Governance",
          "GOV",
          "Execute a documented, risk-based program.",
          "Organizations specify the development of an organizational program.",
          "38",
          "0.0259",
        ],
      ],
      "20000000-0000-4000-8000-000000000001",
    );

    expect(domains.length).toBe(1);
    expect(domains[0]!.domain_code).toBe("GOV");
    expect(domains[0]!.domain_name).toBe(
      "Cybersecurity & Data Protection Governance",
    );
    expect(domains[0]!.description).toBe(
      "Organizations specify the development of an organizational program.",
    );
    expect(domains[0]!.sort_order).toBe(1);
  });

  it("linha sem identificador vira aviso e nao vira dominio", () => {
    const { domains, warnings } = parseDomainsTab(
      [header, ["2", "Sem identificador", "", "", "", "", ""]],
      "20000000-0000-4000-8000-000000000001",
    );
    expect(domains.length).toBe(0);
    expect(warnings.length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run packages/scf-core/src/__tests__/scf-domains.test.ts
```

Esperado: FAIL — o módulo `../scf-domains` não existe.

- [ ] **Step 3: Escrever o parser**

Criar `packages/scf-core/src/importers/scf-domains.ts`:

```ts
/**
 * Parser da aba `SCF Domains & Principles`.
 *
 * A aba é o índice dos domínios do catálogo: identificador, nome, enunciado do
 * princípio SCR e intenção do princípio. Ficou fora do importador porque caía
 * no fallback `crosswalk`, que a edição 2026.1.1 não usa — a tabela
 * `scf_domains` existe desde sempre com `description` vazia.
 *
 * Colunas localizam por texto de cabeçalho normalizado, nunca por posição: uma
 * inserção de coluna a montante não pode deslocar o dado em silêncio. Cabeçalho
 * obrigatório ausente é aviso mais resultado vazio, jamais um palpite.
 *
 * @module scf-domains
 */
import type { ScfDomain } from "../types";
import { normalizeHeaderText } from "./authoritative-sources";

export type ParseDomainsResult = {
  domains: ScfDomain[];
  warnings: string[];
};

const REQUIRED_HEADERS = [
  "scf domain",
  "scf identifier",
  "principle intent",
] as const;

export const parseDomainsTab = (
  rows: string[][],
  versionId: string,
): ParseDomainsResult => {
  const warnings: string[] = [];
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    warnings.push("SCF Domains & Principles: no header row found.");
    return { domains: [], warnings };
  }

  const normalized = headerRow.map((h) => normalizeHeaderText(h ?? ""));
  const colIndex = new Map<string, number>();
  for (const required of REQUIRED_HEADERS) {
    const idx = normalized.indexOf(required);
    if (idx === -1) {
      warnings.push(
        `SCF Domains & Principles: missing required column "${required}".`,
      );
    } else {
      colIndex.set(required, idx);
    }
  }

  if (colIndex.size !== REQUIRED_HEADERS.length) {
    return { domains: [], warnings };
  }

  const nameIdx = colIndex.get("scf domain")!;
  const codeIdx = colIndex.get("scf identifier")!;
  const intentIdx = colIndex.get("principle intent")!;

  const domains: ScfDomain[] = [];
  dataRows.forEach((row, i) => {
    const domainCode = (row[codeIdx] ?? "").trim();
    if (!domainCode) {
      // Linha 1 é o cabeçalho, então dataRows[0] é a linha 2.
      warnings.push(
        `SCF Domains & Principles: row ${i + 2} has a blank SCF Identifier, skipped.`,
      );
      return;
    }

    domains.push({
      id: crypto.randomUUID(),
      scf_version_id: versionId,
      domain_code: domainCode,
      // O campo é domain_name, não name — conferido em xlsx-importer.ts, onde
      // os domínios derivados da aba de controles são construídos.
      domain_name: (row[nameIdx] ?? "").trim() || domainCode,
      // A aba traz dois textos e a tabela tem uma coluna. `Principle Intent` é
      // o mais longo e autocontido; o enunciado do princípio SCR fica de fora,
      // perda declarada na spec §4.1.2 e não esquecimento.
      description: (row[intentIdx] ?? "").trim(),
      sort_order: i + 1,
      is_synthetic: false,
    });
  });

  return { domains, warnings };
};
```

Conferir o tipo `ScfDomain` em `packages/scf-core/src/types.ts` e ajustar os
nomes de campo se divergirem — a tabela é `scf_domains` com `domain_code`,
`name`, `description`, `sort_order`, `is_synthetic`.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run packages/scf-core/src/__tests__/scf-domains.test.ts
```

- [ ] **Step 5: Classificar as duas abas**

Em `packages/scf-core/src/importers/xlsx-tab-parser.ts`:

1. Remover `"compensating controls"` de `METADATA_TAB_NAMES` (linha ≈110) — o
   `startsWith` engolia `"Compensating Controls 2026.1"` como metadado.
2. Acrescentar `compensating_controls` e `domains` à união de tipos no topo.
3. Antes do fallback `crosswalk`, acrescentar:

```ts
  // Detectado antes do fallback de crosswalk: a aba tem coluna de código de
  // controle e seria classificada como crosswalk de um framework chamado
  // "Compensating Controls 2026.1".
  if (nameLower.startsWith("compensating controls")) {
    return { type: "compensating_controls", sheetName };
  }

  if (nameLower.startsWith("scf domains")) {
    return { type: "domains", sheetName };
  }
```

- [ ] **Step 6: Escrever o teste de cobertura de abas e ve-lo passar**

Criar `packages/scf-core/src/__tests__/audit-coverage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyTab } from "../importers/xlsx-tab-parser";

describe("cobertura de abas do workbook 2026.1.1", () => {
  // Os nomes reais das abas de
  // assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx, medidos em
  // 2026-09-09. Uma aba que deixe de ter classificacao propria reprova aqui.
  const ABAS_COM_PARSER = [
    "Authoritative Sources",
    "Evidence Request List 2026.1",
    "Assessment Objectives 2026.1",
    "Data Privacy Mgmt Principles",
    "Threat Catalog",
    "Risk Catalog",
    "SCF Domains & Principles",
    "Compensating Controls 2026.1",
  ];

  it("nenhuma aba conhecida cai em unknown nem no fallback crosswalk", () => {
    const semParser = ABAS_COM_PARSER.filter((nome) => {
      const t = classifyTab(nome, []).type;
      return t === "unknown" || t === "crosswalk";
    });
    expect(semParser).toEqual([]);
  });
});
```

Escrever este teste ANTES do Step 5 e ve-lo falhar listando
`["SCF Domains & Principles", "Compensating Controls 2026.1"]`; o Step 5 e o
que o fecha. Se o Step 5 ja foi aplicado, desfazer, ver o vermelho, refazer.

```bash
npx vitest run packages/scf-core/src/__tests__/audit-coverage.test.ts
```

Esperado apos o Step 5: PASS.

- [ ] **Step 6b: Ligar a auditoria ao CI**

Agora que as abas tem parser, `pnpm audit:scf` sai com codigo 0 e pode ser porta
de CI. Acrescentar `pnpm audit:scf` ao encadeamento de `test:ci` no
`package.json`, entre `pnpm check:migrations` e `pnpm check:openapi`.

- [ ] **Step 7: Ligar o parser de domínios ao importador**

Em `packages/scf-core/src/importers/xlsx-importer.ts`, no laço "Process specific
catalog sheets" (≈linha 1463), acrescentar um ramo:

```ts
      } else if (classification.type === "domains") {
        const rows = parseSheetToRows(sheet);
        const { domains, warnings } = parseDomainsTab(rows, versionId);
        domainsFromTab.push(...domains);
        allWarnings.push(...warnings);
```

declarando `const domainsFromTab: ScfDomain[] = [];` junto das demais
acumuladoras (≈linha 1264).

**A aba enriquece, não substitui.** Os domínios já são criados na leitura da aba
de controles (`xlsx-importer.ts:176-190`), com `description` fabricada —
`` `SCF domain: ${domainName}` ``. Trocar essa descrição inventada pela intenção
do princípio publicada é o ganho inteiro desta mudança. Aplicar o merge por
`domain_code` depois do laço de abas, antes de montar o dataset:

```ts
    // A aba de domínios é a fonte de description e domain_name; ela não cria
    // domínio que a aba de controles não conheça, porque os controles referem
    // domain_id e um domínio sem controle não teria a quem servir.
    const detalhePorCodigo = new Map(
      domainsFromTab.map((d) => [d.domain_code, d]),
    );
    allDomains = allDomains.map((d) => {
      const detalhe = detalhePorCodigo.get(d.domain_code);
      if (!detalhe) return d;
      return {
        ...d,
        domain_name: detalhe.domain_name,
        // A descrição fabricada só cede lugar a texto de verdade.
        description: detalhe.description || d.description,
      };
    });

    const semControle = domainsFromTab
      .filter((d) => !allDomains.some((a) => a.domain_code === d.domain_code))
      .map((d) => d.domain_code);
    if (semControle.length > 0) {
      allWarnings.push(
        `SCF Domains & Principles: domínios sem controle na aba de controles, ignorados: ${semControle.join(", ")}.`,
      );
    }
```

`compensating_controls` **não ganha ramo**: o tipo existe para a auditoria contar.
Está registrado na spec §6 como spec próprio.

- [ ] **Step 8: Corrigir o alvo do upsert de frameworks**

Em `packages/schemas/src/db/scf.repository.ts` (≈linha 1071), trocar:

```ts
          .onConflictDoUpdate({
            target: scfFrameworks.id,
```

por:

```ts
          // O id e um uuid regenerado a cada import por wide-crosswalk.ts, entao
          // o conflito nunca ocorre nele: ocorre no indice unico
          // scf_frameworks_version_framework_uidx, e um re-import na mesma
          // versao abortava com 23505 em vez de atualizar.
          .onConflictDoUpdate({
            target: [scfFrameworks.scfVersionId, scfFrameworks.frameworkId],
```

- [ ] **Step 9: Escrever o teste do re-import**

Acrescentar a `apps/api-gateway/tests/scf-strm-crosswalk.test.ts`:

```ts
test("re-import do mesmo catalogo atualiza o framework em vez de abortar", async () => {
  const { db } = await createDrizzleTestClient();
  await seedCrosswalk(db, 1);

  const { createDrizzleRepositories } = await import(
    "@standard/schemas/db/repositories"
  );
  const repo = createDrizzleRepositories(db as any, {
    STANDARD_ENV: "test",
  } as any).scf.repository;

  // Mesmo framework_code, id novo -- exatamente o que wide-crosswalk.ts produz
  // num segundo import.
  await repo.replaceDataset({
    versions: [{ id: VERSION_ID, version: "test-crosswalk-1.0" }],
    frameworks: [
      {
        id: "30000000-0000-4000-8000-0000000000ff",
        framework_code: "general-iso-27002-2022",
        framework_name: "ISO 27002:2022 (reimportado)",
        status: "active",
        is_synthetic: false,
      },
    ],
    domains: [],
    controls: [],
    requirements: [],
    mappings: [],
    strmRelationships: [],
  } as any);

  const frameworks = await repo.listFrameworks();
  const alvo = frameworks.filter(
    (f: any) => f.framework_code === "general-iso-27002-2022",
  );
  expect(alvo.length).toBe(1);
  expect(alvo[0].framework_name).toBe("ISO 27002:2022 (reimportado)");
});
```

Ajustar a forma do `dataset` ao tipo `ScfDataset` real — conferir em
`packages/scf-core/src/types.ts:64`. Se `replaceDataset` limpar tabelas antes de
inserir, o teste precisa exercitar o caminho de upsert diretamente em vez de
`replaceDataset`; nesse caso chamar o método de upsert em massa que a Task 9
altera.

- [ ] **Step 10: Rodar tudo**

```bash
npx vitest run packages/scf-core/
npx vitest run apps/api-gateway/tests/
pnpm audit:scf
```

Esperado: testes PASS e `pnpm audit:scf` saindo com código 0, agora que as dez
abas têm classificação.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -F - <<'EOF'
fix(scf): consumir a aba de dominios e corrigir o alvo do upsert de frameworks

Duas das dez abas do workbook 2026.1.1 eram descartadas. "Compensating
Controls 2026.1" caia em METADATA_TAB_NAMES por startsWith e morria como
metadado; "SCF Domains & Principles" caia no fallback de crosswalk, que a
edicao 2026.1.1 nao usa.

A aba de dominios passa a popular scf_domains, que ja existia com description
vazia. A de controles compensatorios ganha tipo proprio para a auditoria
conta-la: e um dataset de treze colunas e merece spec propria.

E o upsert de frameworks tinha alvo de conflito no id, que wide-crosswalk.ts
regenera a cada import. O conflito real acontece no indice unico (versao,
codigo), entao um re-import abortava com 23505 em vez de atualizar. Mesma
familia do defeito ja corrigido para scf_mappings.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Verificação final

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:integration`
- [ ] `pnpm check:openapi`
- [ ] `pnpm audit:scf` — sai 0, e as contagens batem com
      `docs/measurements/2026-09-09-cobertura-scf.md`
- [ ] Reproduzir à mão as seis chamadas do relatório de campo que motivaram este
      plano, contra um banco semeado, e confirmar que cada uma devolve o que a
      spec promete.
