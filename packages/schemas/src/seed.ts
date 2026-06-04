/**
 * Standard Synthetic Seed Script
 *
 * Seeds the Neon PostgreSQL database with synthetic staging data.
 * Uses Drizzle ORM for type-safe inserts.
 *
 * Strategy: UPSERT on natural keys → retrieve real IDs → chain FKs correctly.
 * This handles partial seeds and idempotent re-runs without FK violations.
 *
 * Usage: DATABASE_URL="..." pnpm db:seed
 *
 * AGENTS.md compliance:
 *   - §7: All data carries organization_id, organization_id, assessment_id
 *   - §8: SCF data is normative and versioned
 *   - §14: Only synthetic data used
 *   - §17: No real customer data
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "./db/schema";

// ──────────────────────────────────────────────
// Stable synthetic slugs / natural keys
// ──────────────────────────────────────────────
const SYNTH = {
  organizationSlug:       "tenant_synth_a",
  orgSlug:          "org_synth_healthtech",
  userEmail:        "synth-operator@standard.test",
  roleKey:          "org_admin",
  scfVersion:       "2026.1.1",   // must match existing version in DB
  frameworkId:      "SYNTH-STD-1",
  assessmentTrace:  "synth-seed-trace-001",
} as const;

const DOMAIN_CODES = ["GOV", "IAC", "VPM", "BCR", "TPR"] as const;
const CONTROL_MAP: Record<string, { code: string; title: string; domain: string }> = {
  GOV: { code: "GOV-001", title: "Governance Policy",              domain: "GOV" },
  IAC: { code: "IAC-001", title: "Identity and Access Control",    domain: "IAC" },
  VPM: { code: "VPM-001", title: "Vulnerability and Patch Mgmt",  domain: "VPM" },
  BCR: { code: "BCR-001", title: "Backup and Recovery",            domain: "BCR" },
  TPR: { code: "TPR-001", title: "Third Party Risk",               domain: "TPR" },
};

// ──────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required. Set it in .env or pass inline.");
    process.exit(1);
  }

  console.log("🌱 Standard Synthetic Seed — Starting...\n");

  const client = postgres(databaseUrl, { ssl: "require" });
  const db = drizzle(client, { schema });

  // ── 1. Organization (was: Tenant — ADR 0002 Phase 2/3) ──
  // tenants table removed; organizations IS the tenant.
  console.log("  → Seeding organization (was tenant)...");
  await db.insert(schema.organizations).values({
    slug: SYNTH.organizationSlug,
    name: "Synthetic Tenant A",
    status: "active",
  }).onConflictDoNothing();

  const [tenant] = await db.select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, SYNTH.organizationSlug))
    .limit(1);
  if (!tenant) throw new Error("Organization (tenant) not found after insert");
  console.log(`     organizationId = ${tenant.id}`);

  // ── 2. User ──
  console.log("  → Seeding user...");
  await db.insert(schema.users).values({
    email: SYNTH.userEmail,
    displayName: "Synthetic Operator",
    identityProvider: "synthetic",
    identityProviderSubject: "synth-staging-001",
  }).onConflictDoNothing();

  const [user] = await db.select()
    .from(schema.users)
    .where(eq(schema.users.email, SYNTH.userEmail))
    .limit(1);
  if (!user) throw new Error("User not found after insert");

  // ── 3. Role ──
  console.log("  → Seeding role...");
  await db.insert(schema.roles).values({
    key: SYNTH.roleKey,
    name: "Organization Admin",
    description: "Full admin for organization-level operations (synthetic)",
  }).onConflictDoNothing();

  const [role] = await db.select()
    .from(schema.roles)
    .where(eq(schema.roles.key, SYNTH.roleKey))
    .limit(1);
  if (!role) throw new Error("Role not found after insert");

  // ── 4. Organization ──
  // The "tenant" above IS the org context. Create a second org for domain data.
  console.log("  → Seeding organization...");
  await db.insert(schema.organizations).values({
    slug: SYNTH.orgSlug,
    name: "Synthetic HealthTech Organization",
    status: "active",
  }).onConflictDoNothing();

  const [org] = await db.select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, SYNTH.orgSlug))
    .limit(1);
  if (!org) throw new Error("Organization not found after insert");
  console.log(`     organizationId = ${org.id}`);

  // ── 5. Membership ──
  console.log("  → Seeding membership...");
  await db.insert(schema.memberships).values({
    organizationId: org.id,
    userId: user.id,
    roleId: role.id,
    status: "active",
  }).onConflictDoNothing();

  // ── 6. SCF Version (use existing or create) ──
  console.log("  → Seeding SCF version...");
  await db.insert(schema.scfVersions).values({
    version: SYNTH.scfVersion,
  }).onConflictDoNothing();

  const [scfVersion] = await db.select()
    .from(schema.scfVersions)
    .where(eq(schema.scfVersions.version, SYNTH.scfVersion))
    .limit(1);
  if (!scfVersion) throw new Error("SCF Version not found after insert");
  console.log(`     scfVersionId = ${scfVersion.id}`);

  // ── 7. SCF Domains — upsert by (scf_version_id, domain_code) ──
  console.log("  → Seeding SCF domains...");
  const domainRows = DOMAIN_CODES.map(code => ({
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
    const rows = await db.select({ id: schema.scfDomains.id, code: schema.scfDomains.domainCode })
      .from(schema.scfDomains)
      .where(and(
        eq(schema.scfDomains.scfVersionId, scfVersion.id),
        eq(schema.scfDomains.domainCode, code)
      ))
      .limit(1);
    if (rows[0]) domainIdMap[code] = rows[0].id;
    else console.warn(`     ⚠️  Domain ${code} not found after insert`);
  }
  console.log(`     Domains resolved: ${Object.keys(domainIdMap).join(", ")}`);

  // ── 8. SCF Controls — upsert by (scf_version_id, control_code) ──
  console.log("  → Seeding SCF controls...");
  const controlIdMap: Record<string, string> = {};

  for (const [domainKey, ctrl] of Object.entries(CONTROL_MAP)) {
    const domainId = domainIdMap[domainKey];
    if (!domainId) {
      console.warn(`     ⚠️  Skipping control ${ctrl.code} — domain ${domainKey} not found`);
      continue;
    }
    await db.insert(schema.scfControls).values({
      scfVersionId: scfVersion.id,
      scfDomainId: domainId,
      controlCode: ctrl.code,
      title: ctrl.title,
    }).onConflictDoNothing();

    const rows = await db.select({ id: schema.scfControls.id })
      .from(schema.scfControls)
      .where(and(
        eq(schema.scfControls.scfVersionId, scfVersion.id),
        eq(schema.scfControls.controlCode, ctrl.code)
      ))
      .limit(1);
    if (rows[0]) controlIdMap[ctrl.code] = rows[0].id;
  }
  console.log(`     Controls resolved: ${Object.keys(controlIdMap).join(", ")}`);

  // ── 9. SCF Framework ──
  console.log("  → Seeding SCF framework...");
  await db.insert(schema.scfFrameworks).values({
    scfVersionId: scfVersion.id,
    frameworkId: SYNTH.frameworkId,
    name: "Synthetic Standard Framework 1",
    versionLabel: "1.0",
    publisher: "Standard Synthetic Publisher",
  }).onConflictDoNothing();

  const [framework] = await db.select()
    .from(schema.scfFrameworks)
    .where(and(
      eq(schema.scfFrameworks.scfVersionId, scfVersion.id),
      eq(schema.scfFrameworks.frameworkId, SYNTH.frameworkId)
    ))
    .limit(1);
  if (!framework) throw new Error("Framework not found after insert");
  console.log(`     frameworkId = ${framework.id}`);

  // ── 10. SCF Framework Requirements ──
  console.log("  → Seeding SCF framework requirements...");
  const reqDefs = [
    { code: "SYNTH-1.1", title: "Governance Policy",       domainKey: "GOV" },
    { code: "SYNTH-1.2", title: "Access Control",          domainKey: "IAC" },
    { code: "SYNTH-1.3", title: "Vulnerability Mgmt",     domainKey: "VPM" },
    { code: "SYNTH-1.4", title: "Backup and Recovery",     domainKey: "BCR" },
    { code: "SYNTH-1.5", title: "Vendor Management",       domainKey: "TPR" },
  ];
  const reqIdMap: Record<string, string> = {};

  for (const req of reqDefs) {
    await db.insert(schema.scfFrameworkRequirements).values({
      scfVersionId: scfVersion.id,
      scfFrameworkId: framework.id,
      requirementCode: req.code,
      title: req.title,
    }).onConflictDoNothing();

    const rows = await db.select({ id: schema.scfFrameworkRequirements.id })
      .from(schema.scfFrameworkRequirements)
      .where(and(
        eq(schema.scfFrameworkRequirements.scfVersionId, scfVersion.id),
        eq(schema.scfFrameworkRequirements.requirementCode, req.code)
      ))
      .limit(1);
    if (rows[0]) reqIdMap[req.code] = rows[0].id;
  }

  // ── 11. SCF Mappings ──
  console.log("  → Seeding SCF mappings...");
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
      console.warn(`     ⚠️  Skipping mapping ${pair.reqCode} ↔ ${pair.ctrlCode}`);
      continue;
    }
    await db.insert(schema.scfMappings).values({
      scfVersionId: scfVersion.id,
      scfFrameworkRequirementId: reqId,
      scfControlId: ctrlId,
      relationshipType: "direct",
      relationshipStrength: "strong",
      mappingSource: "official_scf",
    }).onConflictDoNothing();
  }

  // ── 12. Assessment (draft) ──
  console.log("  → Seeding assessment...");
  await db.insert(schema.assessments).values({
    organizationId: org.id,
    name: "Synthetic ISO Readiness Assessment",
    state: "draft",
    scfVersionId: scfVersion.id,
    createdBy: user.id,
    traceId: SYNTH.assessmentTrace,
  }).onConflictDoNothing();

  const [assessment] = await db.select()
    .from(schema.assessments)
    .where(eq(schema.assessments.traceId, SYNTH.assessmentTrace)
    ))
    .limit(1);
  if (!assessment) throw new Error("Assessment not found after insert");
  console.log(`     assessmentId = ${assessment.id}`);

  // ── 13. Assessment Framework Selection ──
  console.log("  → Seeding assessment framework...");
  await db.insert(schema.assessmentFrameworks).values({
    organizationId: org.id,
    assessmentId: assessment.id,
    scfFrameworkId: framework.id,
    status: "draft",
    selectedBy: user.id,
    selectedAt: new Date(),
  }).onConflictDoNothing();

  // ── 14. Audit Log ──
  console.log("  → Recording seed audit event...");
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

  console.log("\n✅ Standard Synthetic Seed — Complete!");
  console.log(`   Tenant:       ${tenant.id}`);
  console.log(`   Organization: ${org.id}`);
  console.log(`   Assessment:   ${assessment.id}`);
  console.log(`   SCF Version:  ${scfVersion.id} (${scfVersion.version})`);
  console.log(`   Framework:    ${framework.id}`);
  console.log(`   User:         ${user.id}`);
  console.log(`   Controls:     ${Object.keys(controlIdMap).length} (${Object.keys(controlIdMap).join(", ")})`);
  console.log(`   Requirements: ${Object.keys(reqIdMap).length}`);
  console.log(`   Mappings:     ${mappingPairs.length}`);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
