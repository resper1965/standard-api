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
