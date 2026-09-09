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
