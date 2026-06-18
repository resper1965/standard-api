import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";
import "dotenv/config";
import "dotenv/config";
import { eq } from "drizzle-orm";

/**
 * Seed script for ONS / ANEEL Framework
 * This demonstrates how to ingest a Global Consultative Framework
 * without breaking the SCF architecture constraints.
 */
async function seedOnsFramework() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(connectionString);
  const db = drizzle(sql, { schema });

  console.log("ðŸŒ± Starting ONS/ANEEL Framework Seed...");

  // 1. Get the latest Active SCF Version
  const activeScfVersions = await db
    .select()
    .from(schema.scfVersions)
    .orderBy(schema.scfVersions.createdAt)
    .limit(1);

  if (activeScfVersions.length === 0) {
    throw new Error("No active SCF version found to map against.");
  }

  const scfVersionId = activeScfVersions[0]!.id;
  console.log(`\u2714 Found Active SCF Version: ${scfVersionId}`);

  // 2. Create the ONS Framework (Global)
  // organizationId is NULL because this is a global framework maintained by Standard.
  const onsFrameworkId = crypto.randomUUID();
  await db.insert(schema.scfFrameworks).values({
    id: onsFrameworkId,
    scfVersionId,
    frameworkId: "ONS-RO-901.000",
    name: "Rotina Operacional ONS 901.000",
    publisher: "ONS / ANEEL",
    category: "CiberseguranÃ§a do Setor ElÃ©trico",
    isSynthetic: true, // Marking as synthetic for safe cleanup
  });

  console.log("\u2714 Inserted ONS Framework.");

  // 3. Create ONS Requirements
  const req1Id = crypto.randomUUID();
  const req2Id = crypto.randomUUID();

  await db.insert(schema.scfFrameworkRequirements).values([
    {
      id: req1Id,
      scfVersionId,
      scfFrameworkId: onsFrameworkId,
      requirementCode: "ONS-RO-1.1",
      title: "Controle de Acesso LÃ³gico",
      description: "Os agentes devem implementar MFA para sistemas crÃ­ticos.",
      isMcr: true,
      mcrRationale: "MandatÃ³rio conforme artigo 5 da RN ANEEL.",
      isSynthetic: true,
    },
    {
      id: req2Id,
      scfVersionId,
      scfFrameworkId: onsFrameworkId,
      requirementCode: "ONS-RO-2.4",
      title: "Plano de Resposta a Incidentes",
      description: "Agentes do setor elÃ©trico devem notificar o ONS em 4h.",
      isSynthetic: true,
    },
  ]);

  console.log("\u2714 Inserted ONS Requirements.");

  // 4. Create Consultative STRM Mappings
  // We need to find matching SCF controls to map to.
  // We'll just grab two random controls for the mock.
  const randomControls = await db
    .select({ id: schema.scfControls.id })
    .from(schema.scfControls)
    .where(eq(schema.scfControls.scfVersionId, scfVersionId))
    .limit(2);

  if (randomControls.length < 2) {
    throw new Error("Not enough SCF Controls to mock mappings.");
  }

  await db.insert(schema.scfMappings).values([
    {
      scfVersionId,
      scfFrameworkRequirementId: req1Id,
      scfControlId: randomControls[0]!.id,
      relationshipType: "intersects",
      strengthScore: "0.8",
      mappingSource: "consultative", // NOT official_scf
      isOfficial: false, // Explicitly false
      mappingRationale:
        "Mapeamento consultivo gerado para atender MFA em ambientes ICS.",
      isSynthetic: true,
    },
    {
      scfVersionId,
      scfFrameworkRequirementId: req2Id,
      scfControlId: randomControls[1]!.id,
      relationshipType: "equal",
      mappingSource: "consultative",
      isOfficial: false,
      mappingRationale:
        "A notificaÃ§Ã£o de 4h Ã© perfeitamente atendida pelo controle SCF-IRO.01.",
      isSynthetic: true,
    },
  ]);

  console.log("\u2714 Inserted Consultative STRM Mappings.");
  console.log("âœ¨ Seed completed successfully!");

  await sql.end();
}

seedOnsFramework().catch((err) => {
  console.error(err);
  process.exit(1);
});
