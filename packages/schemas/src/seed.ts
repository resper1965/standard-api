// @ts-nocheck -- Zod v4 CI type compat
/**
 * Standard Synthetic Seed Script
 *
 * Seeds the Neon PostgreSQL database with synthetic staging data.
 * Uses Drizzle ORM for type-safe inserts.
 *
 * Strategy: UPSERT on natural keys â†’ retrieve real IDs â†’ chain FKs correctly.
 * This handles partial seeds and idempotent re-runs without FK violations.
 *
 * Usage: DATABASE_URL="..." pnpm db:seed
 *
 * AGENTS.md compliance:
 *   - Â§7: All data carries organization_id, organization_id, assessment_id
 *   - Â§8: SCF data is normative and versioned
 *   - Â§14: Only synthetic data used
 *   - Â§17: No real customer data
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "./db/schema";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Stable synthetic slugs / natural keys
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SYNTH = {
  organizationSlug: "tenant_synth_a",
  orgSlug: "org_synth_healthtech",
  userEmail: "synth-operator@standard.test",
  roleKey: "org_admin",
  scfVersion: "2026.1.1", // must match existing version in DB
  frameworkId: "SYNTH-STD-1",
  assessmentTrace: "synth-seed-trace-001",
} as const;

const DOMAIN_CODES = ["GOV", "IAC", "VPM", "BCR", "TPR"] as const;
const CONTROL_MAP: Record<
  string,
  { code: string; title: string; domain: string }
> = {
  GOV: { code: "GOV-001", title: "Governance Policy", domain: "GOV" },
  IAC: { code: "IAC-001", title: "Identity and Access Control", domain: "IAC" },
  VPM: {
    code: "VPM-001",
    title: "Vulnerability and Patch Mgmt",
    domain: "VPM",
  },
  BCR: { code: "BCR-001", title: "Backup and Recovery", domain: "BCR" },
  TPR: { code: "TPR-001", title: "Third Party Risk", domain: "TPR" },
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "âŒ DATABASE_URL is required. Set it in .env or pass inline.",
    );
    process.exit(1);
  }

  console.log("ðŸŒ± Standard Synthetic Seed â€” Starting...\n");

  const client = postgres(databaseUrl, { ssl: "require" });
  const db = drizzle(client, { schema });

  // â”€â”€ 1. Organization (was: Tenant â€” ADR 0002 Phase 2/3) â”€â”€
  // tenants table removed; organizations IS the tenant.
  console.log("  â†’ Seeding organization (was tenant)...");
  await db
    .insert(schema.organizations)
    .values({
      slug: SYNTH.organizationSlug,
      name: "Synthetic Tenant A",
      status: "active",
    })
    .onConflictDoNothing();

  const [tenant] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, SYNTH.organizationSlug))
    .limit(1);
  if (!tenant) throw new Error("Organization (tenant) not found after insert");
  console.log(`     organizationId = ${tenant.id}`);

  // â”€â”€ 2. User â”€â”€
  console.log("  â†’ Seeding user...");
  await db
    .insert(schema.users)
    .values({
      email: SYNTH.userEmail,
      displayName: "Synthetic Operator",
      identityProvider: "synthetic",
      identityProviderSubject: "synth-staging-001",
    })
    .onConflictDoNothing();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, SYNTH.userEmail))
    .limit(1);
  if (!user) throw new Error("User not found after insert");

  // â”€â”€ 3. Role â”€â”€
  console.log("  â†’ Seeding role...");
  await db
    .insert(schema.roles)
    .values({
      key: SYNTH.roleKey,
      name: "Organization Admin",
      description: "Full admin for organization-level operations (synthetic)",
    })
    .onConflictDoNothing();

  const [role] = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.key, SYNTH.roleKey))
    .limit(1);
  if (!role) throw new Error("Role not found after insert");

  // â”€â”€ 4. Organization â”€â”€
  // The "tenant" above IS the org context. Create a second org for domain data.
  console.log("  â†’ Seeding organization...");
  await db
    .insert(schema.organizations)
    .values({
      slug: SYNTH.orgSlug,
      name: "Synthetic HealthTech Organization",
      status: "active",
    })
    .onConflictDoNothing();

  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, SYNTH.orgSlug))
    .limit(1);
  if (!org) throw new Error("Organization not found after insert");
  console.log(`     organizationId = ${org.id}`);

  // â”€â”€ 5. Membership â”€â”€
  console.log("  â†’ Seeding membership...");
  await db
    .insert(schema.memberships)
    .values({
      organizationId: org.id,
      userId: user.id,
      roleId: role.id,
      status: "active",
    })
    .onConflictDoNothing();

  // â”€â”€ 6. SCF Version (use existing or create) â”€â”€
  console.log("  â†’ Seeding SCF version...");
  await db
    .insert(schema.scfVersions)
    .values({
      version: SYNTH.scfVersion,
    })
    .onConflictDoNothing();

  const [scfVersion] = await db
    .select()
    .from(schema.scfVersions)
    .where(eq(schema.scfVersions.version, SYNTH.scfVersion))
    .limit(1);
  if (!scfVersion) throw new Error("SCF Version not found after insert");
  console.log(`     scfVersionId = ${scfVersion.id}`);

  // â”€â”€ 7. SCF Domains â€” upsert by (scf_version_id, domain_code) â”€â”€
  console.log("  â†’ Seeding SCF domains...");
  const domainRows = DOMAIN_CODES.map((code) => ({
    scfVersionId: scfVersion.id,
    domainCode: code,
    name: {
      GOV: "Governance & Management",
      IAC: "Identity & Access Control",
      VPM: "Vulnerability & Patch Management",
      BCR: "Backup & Recovery",
      TPR: "Third Party Risk",
    }[code]!,
  }));

  for (const d of domainRows) {
    await db.insert(schema.scfDomains).values(d).onConflictDoNothing();
  }

  // Retrieve real domain IDs
  const domainIdMap: Record<string, string> = {};
  for (const code of DOMAIN_CODES) {
    const rows = await db
      .select({ id: schema.scfDomains.id, code: schema.scfDomains.domainCode })
      .from(schema.scfDomains)
      .where(
        and(
          eq(schema.scfDomains.scfVersionId, scfVersion.id),
          eq(schema.scfDomains.domainCode, code),
        ),
      )
      .limit(1);
    if (rows[0]) domainIdMap[code] = rows[0].id;
    else console.warn(`     âš ï¸  Domain ${code} not found after insert`);
  }
  console.log(`     Domains resolved: ${Object.keys(domainIdMap).join(", ")}`);

  // â”€â”€ 8. SCF Controls â€” upsert by (scf_version_id, control_code) â”€â”€
  console.log("  â†’ Seeding SCF controls...");
  const controlIdMap: Record<string, string> = {};

  for (const [domainKey, ctrl] of Object.entries(CONTROL_MAP)) {
    const domainId = domainIdMap[domainKey];
    if (!domainId) {
      console.warn(
        `     âš ï¸  Skipping control ${ctrl.code} â€” domain ${domainKey} not found`,
      );
      continue;
    }
    await db
      .insert(schema.scfControls)
      .values({
        scfVersionId: scfVersion.id,
        scfDomainId: domainId,
        controlCode: ctrl.code,
        title: ctrl.title,
      })
      .onConflictDoNothing();

    const rows = await db
      .select({ id: schema.scfControls.id })
      .from(schema.scfControls)
      .where(
        and(
          eq(schema.scfControls.scfVersionId, scfVersion.id),
          eq(schema.scfControls.controlCode, ctrl.code),
        ),
      )
      .limit(1);
    if (rows[0]) controlIdMap[ctrl.code] = rows[0].id;
  }
  console.log(
    `     Controls resolved: ${Object.keys(controlIdMap).join(", ")}`,
  );

  // â”€â”€ 9. SCF Framework â”€â”€
  console.log("  â†’ Seeding SCF framework...");
  await db
    .insert(schema.scfFrameworks)
    .values({
      scfVersionId: scfVersion.id,
      frameworkId: SYNTH.frameworkId,
      name: "Synthetic Standard Framework 1",
      versionLabel: "1.0",
      publisher: "Standard Synthetic Publisher",
    })
    .onConflictDoNothing();

  const [framework] = await db
    .select()
    .from(schema.scfFrameworks)
    .where(
      and(
        eq(schema.scfFrameworks.scfVersionId, scfVersion.id),
        eq(schema.scfFrameworks.frameworkId, SYNTH.frameworkId),
      ),
    )
    .limit(1);
  if (!framework) throw new Error("Framework not found after insert");
  console.log(`     frameworkId = ${framework.id}`);

  // â”€â”€ 10. SCF Framework Requirements â”€â”€
  console.log("  â†’ Seeding SCF framework requirements...");
  const reqDefs = [
    { code: "SYNTH-1.1", title: "Governance Policy", domainKey: "GOV" },
    { code: "SYNTH-1.2", title: "Access Control", domainKey: "IAC" },
    { code: "SYNTH-1.3", title: "Vulnerability Mgmt", domainKey: "VPM" },
    { code: "SYNTH-1.4", title: "Backup and Recovery", domainKey: "BCR" },
    { code: "SYNTH-1.5", title: "Vendor Management", domainKey: "TPR" },
  ];
  const reqIdMap: Record<string, string> = {};

  for (const req of reqDefs) {
    await db
      .insert(schema.scfFrameworkRequirements)
      .values({
        scfVersionId: scfVersion.id,
        scfFrameworkId: framework.id,
        requirementCode: req.code,
        title: req.title,
      })
      .onConflictDoNothing();

    const rows = await db
      .select({ id: schema.scfFrameworkRequirements.id })
      .from(schema.scfFrameworkRequirements)
      .where(
        and(
          eq(schema.scfFrameworkRequirements.scfVersionId, scfVersion.id),
          eq(schema.scfFrameworkRequirements.requirementCode, req.code),
        ),
      )
      .limit(1);
    if (rows[0]) reqIdMap[req.code] = rows[0].id;
  }

  // â”€â”€ 11. SCF Mappings â”€â”€
  console.log("  â†’ Seeding SCF mappings...");
  const mappingPairs = [
    { reqCode: "SYNTH-1.1", ctrlCode: "GOV-001" },
    { reqCode: "SYNTH-1.2", ctrlCode: "IAC-001" },
    { reqCode: "SYNTH-1.3", ctrlCode: "VPM-001" },
    { reqCode: "SYNTH-1.4", ctrlCode: "BCR-001" },
    { reqCode: "SYNTH-1.5", ctrlCode: "TPR-001" },
  ];

  for (const pair of mappingPairs) {
    const reqId = reqIdMap[pair.reqCode];
    const ctrlId = controlIdMap[pair.ctrlCode];
    if (!reqId || !ctrlId) {
      console.warn(
        `     âš ï¸  Skipping mapping ${pair.reqCode} â†” ${pair.ctrlCode}`,
      );
      continue;
    }
    await db
      .insert(schema.scfMappings)
      .values({
        scfVersionId: scfVersion.id,
        scfFrameworkRequirementId: reqId,
        scfControlId: ctrlId,
        relationshipType: "equal",
        relationshipStrength: "strong",
        mappingSource: "official_scf",
      })
      .onConflictDoNothing();
  }

  // â”€â”€ 12. Assessment (draft) â”€â”€
  console.log("  â†’ Seeding assessment...");
  await db
    .insert(schema.assessments)
    .values({
      organizationId: org.id,
      name: "Synthetic ISO Readiness Assessment",
      state: "draft",
      scfVersionId: scfVersion.id,
      createdBy: user.id,
      traceId: SYNTH.assessmentTrace,
    })
    .onConflictDoNothing();

  const [assessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.traceId, SYNTH.assessmentTrace))
    .limit(1);
  if (!assessment) throw new Error("Assessment not found after insert");
  console.log(`     assessmentId = ${assessment.id}`);

  // â”€â”€ 13. Assessment Framework Selection â”€â”€
  console.log("  â†’ Seeding assessment framework...");
  await db
    .insert(schema.assessmentFrameworks)
    .values({
      organizationId: org.id,
      assessmentId: assessment.id,
      scfFrameworkId: framework.id,
      status: "draft",
      selectedBy: user.id,
      selectedAt: new Date(),
    })
    .onConflictDoNothing();

  // â”€â”€ 14. Audit Log â”€â”€
  console.log("  â†’ Recording seed audit event...");
  await db.insert(schema.auditLogs).values({
    action: "synthetic_seed_executed",
    organizationId: org.id,
    actorId: user.id,
    resourceType: "seed_script",
    traceId: SYNTH.assessmentTrace,
    metadata: {
      script: "packages/schemas/src/seed.ts",
      seeded_at: new Date().toISOString(),
      fixture_source: "evals/fixtures",
    },
  });

  console.log("\nâœ… Standard Synthetic Seed â€” Complete!");
  console.log(`   Tenant:       ${tenant.id}`);
  console.log(`   Organization: ${org.id}`);
  console.log(`   Assessment:   ${assessment.id}`);
  console.log(`   SCF Version:  ${scfVersion.id} (${scfVersion.version})`);
  console.log(`   Framework:    ${framework.id}`);
  console.log(`   User:         ${user.id}`);
  console.log(
    `   Controls:     ${Object.keys(controlIdMap).length} (${Object.keys(controlIdMap).join(", ")})`,
  );
  console.log(`   Requirements: ${Object.keys(reqIdMap).length}`);
  console.log(`   Mappings:     ${mappingPairs.length}`);

  await client.end();
}

main().catch((err) => {
  console.error("âŒ Seed failed:", err);
  process.exit(1);
});

