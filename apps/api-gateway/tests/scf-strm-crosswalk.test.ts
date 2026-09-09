/**
 * Regressões do crosswalk STRM medidas contra Postgres real (PGlite).
 *
 * O repositório em memória de scf-core não filtra por versão e não faz join
 * nenhum, então um teste de B1 contra ele passaria sem provar nada. Estes
 * testes existem para exercitar o SQL.
 */
import { createDrizzleTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";
import * as schema from "@standard/schemas";
import { eq } from "drizzle-orm";

const VERSION_ID = "30000000-0000-4000-8000-000000000001";
const DOMAIN_ID = "30000000-0000-4000-8000-000000000002";
const CONTROL_ID = "30000000-0000-4000-8000-000000000003";
const FRAMEWORK_ID = "30000000-0000-4000-8000-000000000004";

/**
 * Semeia uma versão com um controle, um framework e N linhas STRM sem mapping.
 *
 * O PGlite subjacente é um singleton compartilhado por todo o arquivo de
 * teste (ver getTestDb em helpers.ts), então dois testes que chamam esta
 * função com os mesmos IDs de versão/controle/framework colidiriam: o
 * segundo insert de versão bateria na chave primária, e sem a limpeza abaixo
 * as linhas STRM do primeiro teste vazariam para a contagem do segundo.
 * onConflictDoNothing torna a semente idempotente; o delete por controle
 * garante que cada teste veja exatamente as linhas que ele mesmo inseriu.
 */
const seedCrosswalk = async (db: any, strmRowCount: number) => {
  await db
    .insert(schema.scfVersions)
    .values({
      id: VERSION_ID,
      version: "test-crosswalk-1.0",
    })
    .onConflictDoNothing();
  await db
    .insert(schema.scfDomains)
    .values({
      id: DOMAIN_ID,
      scfVersionId: VERSION_ID,
      domainCode: "GOV",
      name: "Governance",
    })
    .onConflictDoNothing();
  await db
    .insert(schema.scfControls)
    .values({
      id: CONTROL_ID,
      scfVersionId: VERSION_ID,
      scfDomainId: DOMAIN_ID,
      controlCode: "GOV-01",
      title: "Security Program",
    })
    .onConflictDoNothing();
  await db
    .insert(schema.scfFrameworks)
    .values({
      id: FRAMEWORK_ID,
      scfVersionId: VERSION_ID,
      frameworkId: "general-iso-27002-2022",
      name: "ISO 27002:2022",
    })
    .onConflictDoNothing();

  await db
    .delete(schema.scfStrmRelationships)
    .where(eq(schema.scfStrmRelationships.scfControlId, CONTROL_ID));

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
