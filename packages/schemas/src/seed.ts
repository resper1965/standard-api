/**
 * Aegis Synthetic Seed Script
 *
 * Seeds the Neon PostgreSQL database with synthetic staging data
 * derived from evals/fixtures. Uses Drizzle ORM for type-safe inserts.
 *
 * Usage: DATABASE_URL="..." pnpm db:seed
 *
 * AGENTS.md compliance:
 *   - §7: All data carries tenant_id, organization_id, assessment_id
 *   - §8: SCF data is normative and versioned
 *   - §14: Only synthetic data used
 *   - §17: No real customer data
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";

// ──────────────────────────────────────────────
// Synthetic IDs (stable, deterministic UUIDs from evals/fixtures)
// ──────────────────────────────────────────────

const IDS = {
  tenant: "10000000-0000-4000-8000-000000000001",
  organization: "20000000-0000-4000-8000-000000000001",
  assessment: "30000000-0000-4000-8000-000000000001",
  framework: "40000000-0000-4000-8000-000000000001",
  scfVersion: "50000000-0000-4000-8000-000000000001",
  user: "60000000-0000-4000-8000-000000000001",
  role: "70000000-0000-4000-8000-000000000001",
  domains: {
    GOV: "53000000-0000-4000-8000-000000000001",
    IAC: "53000000-0000-4000-8000-000000000002",
    VPM: "53000000-0000-4000-8000-000000000003",
    BCR: "53000000-0000-4000-8000-000000000004",
    TPR: "53000000-0000-4000-8000-000000000005",
  },
  controls: [
    "51000000-0000-4000-8000-000000000001",
    "51000000-0000-4000-8000-000000000002",
    "51000000-0000-4000-8000-000000000003",
    "51000000-0000-4000-8000-000000000004",
    "51000000-0000-4000-8000-000000000005",
  ],
  requirements: [
    "52000000-0000-4000-8000-000000000001",
    "52000000-0000-4000-8000-000000000002",
    "52000000-0000-4000-8000-000000000003",
    "52000000-0000-4000-8000-000000000004",
    "52000000-0000-4000-8000-000000000005",
  ],
  mappings: [
    "54000000-0000-4000-8000-000000000001",
    "54000000-0000-4000-8000-000000000002",
    "54000000-0000-4000-8000-000000000003",
    "54000000-0000-4000-8000-000000000004",
    "54000000-0000-4000-8000-000000000005",
  ],
} as const;

// ──────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required. Set it in .env or pass inline.");
    process.exit(1);
  }

  console.log("🌱 Aegis Synthetic Seed — Starting...\n");

  const client = postgres(databaseUrl, { ssl: "require" });
  const db = drizzle(client, { schema });

  // ── 1. Tenant ──
  console.log("  → Seeding tenant...");
  await db.insert(schema.tenants).values({
    id: IDS.tenant,
    slug: "tenant_synth_a",
    name: "Synthetic Tenant A",
    status: "active",
  }).onConflictDoNothing();

  // ── 2. User (synthetic staging operator) ──
  console.log("  → Seeding user...");
  await db.insert(schema.users).values({
    id: IDS.user,
    email: "synth-operator@aegis.test",
    displayName: "Synthetic Operator",
    identityProvider: "synthetic",
    identityProviderSubject: "synth-staging-001",
  }).onConflictDoNothing();

  // ── 3. Role ──
  console.log("  → Seeding role...");
  await db.insert(schema.roles).values({
    id: IDS.role,
    key: "org_admin",
    name: "Organization Admin",
    description: "Full admin for organization-level operations (synthetic)",
  }).onConflictDoNothing();

  // ── 4. Organization ──
  console.log("  → Seeding organization...");
  await db.insert(schema.organizations).values({
    id: IDS.organization,
    tenantId: IDS.tenant,
    slug: "org_synth_healthtech",
    name: "Synthetic HealthTech Organization",
    status: "active",
  }).onConflictDoNothing();

  // ── 5. Membership ──
  console.log("  → Seeding membership...");
  await db.insert(schema.memberships).values({
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    userId: IDS.user,
    roleId: IDS.role,
    status: "active",
  }).onConflictDoNothing();

  // ── 6. SCF Version ──
  console.log("  → Seeding SCF version...");
  await db.insert(schema.scfVersions).values({
    id: IDS.scfVersion,
    version: "SYNTH-SCF-1",
  }).onConflictDoNothing();

  // ── 7. SCF Domains ──
  console.log("  → Seeding SCF domains...");
  const domains = [
    { id: IDS.domains.GOV, domainCode: "GOV", name: "Governance & Management" },
    { id: IDS.domains.IAC, domainCode: "IAC", name: "Identity & Access Control" },
    { id: IDS.domains.VPM, domainCode: "VPM", name: "Vulnerability & Patch Management" },
    { id: IDS.domains.BCR, domainCode: "BCR", name: "Backup & Recovery" },
    { id: IDS.domains.TPR, domainCode: "TPR", name: "Third Party Risk" },
  ];
  for (const d of domains) {
    await db.insert(schema.scfDomains).values({
      ...d,
      scfVersionId: IDS.scfVersion,
    }).onConflictDoNothing();
  }

  // ── 8. SCF Controls ──
  console.log("  → Seeding SCF controls...");
  const controls = [
    { id: IDS.controls[0], controlCode: "GOV-001", title: "Governance Policy", domainId: IDS.domains.GOV },
    { id: IDS.controls[1], controlCode: "IAC-001", title: "Identity and Access Control", domainId: IDS.domains.IAC },
    { id: IDS.controls[2], controlCode: "VPM-001", title: "Vulnerability and Patch Management", domainId: IDS.domains.VPM },
    { id: IDS.controls[3], controlCode: "BCR-001", title: "Backup and Recovery", domainId: IDS.domains.BCR },
    { id: IDS.controls[4], controlCode: "TPR-001", title: "Third Party Risk", domainId: IDS.domains.TPR },
  ];
  for (const c of controls) {
    await db.insert(schema.scfControls).values({
      id: c.id,
      scfVersionId: IDS.scfVersion,
      scfDomainId: c.domainId,
      controlCode: c.controlCode,
      title: c.title,
    }).onConflictDoNothing();
  }

  // ── 9. SCF Framework ──
  console.log("  → Seeding SCF framework...");
  await db.insert(schema.scfFrameworks).values({
    id: IDS.framework,
    scfVersionId: IDS.scfVersion,
    frameworkId: "SYNTH-STD-1",
    name: "Synthetic Standard 1",
    versionLabel: "1.0",
    publisher: "Aegis Synthetic Publisher",
  }).onConflictDoNothing();

  // ── 10. SCF Framework Requirements ──
  console.log("  → Seeding SCF framework requirements...");
  const requirements = [
    { id: IDS.requirements[0], requirementCode: "SYNTH-1.1", title: "Governance Policy" },
    { id: IDS.requirements[1], requirementCode: "SYNTH-1.2", title: "Access Control" },
    { id: IDS.requirements[2], requirementCode: "SYNTH-1.3", title: "Vulnerability Management" },
    { id: IDS.requirements[3], requirementCode: "SYNTH-1.4", title: "Backup and Recovery" },
    { id: IDS.requirements[4], requirementCode: "SYNTH-1.5", title: "Vendor Management" },
  ];
  for (const r of requirements) {
    await db.insert(schema.scfFrameworkRequirements).values({
      id: r.id,
      scfVersionId: IDS.scfVersion,
      scfFrameworkId: IDS.framework,
      requirementCode: r.requirementCode,
      title: r.title,
    }).onConflictDoNothing();
  }

  // ── 11. SCF Mappings (Control ↔ Requirement) ──
  console.log("  → Seeding SCF mappings...");
  for (let i = 0; i < 5; i++) {
    await db.insert(schema.scfMappings).values({
      id: IDS.mappings[i],
      scfVersionId: IDS.scfVersion,
      scfFrameworkRequirementId: IDS.requirements[i]!,
      scfControlId: IDS.controls[i]!,
      relationshipType: "direct",
      relationshipStrength: "strong",
      mappingSource: "official_scf",
    }).onConflictDoNothing();
  }

  // ── 12. Assessment (draft state) ──
  console.log("  → Seeding assessment...");
  await db.insert(schema.assessments).values({
    id: IDS.assessment,
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    name: "Synthetic ISO Readiness Assessment",
    state: "draft",
    scfVersionId: IDS.scfVersion,
    createdBy: IDS.user,
    traceId: "synth-seed-trace-001",
  }).onConflictDoNothing();

  // ── 13. Assessment Framework Selection ──
  console.log("  → Seeding assessment framework...");
  await db.insert(schema.assessmentFrameworks).values({
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    assessmentId: IDS.assessment,
    scfFrameworkId: IDS.framework,
    status: "draft",
    selectedBy: IDS.user,
    selectedAt: new Date(),
  }).onConflictDoNothing();

  // ── 14. Audit Log (seed event) ──
  console.log("  → Recording seed audit event...");
  await db.insert(schema.auditLogs).values({
    action: "synthetic_seed_executed",
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    actorId: IDS.user,
    resourceType: "seed_script",
    traceId: "synth-seed-trace-001",
    metadata: {
      script: "packages/schemas/src/seed.ts",
      seeded_at: new Date().toISOString(),
      fixture_source: "evals/fixtures",
    },
  });

  console.log("\n✅ Aegis Synthetic Seed — Complete!");
  console.log(`   Tenant:       ${IDS.tenant}`);
  console.log(`   Organization: ${IDS.organization}`);
  console.log(`   Assessment:   ${IDS.assessment}`);
  console.log(`   SCF Version:  ${IDS.scfVersion}`);
  console.log(`   Framework:    ${IDS.framework}`);
  console.log(`   User:         ${IDS.user}`);
  console.log(`   Controls:     5 (GOV, IAC, VPM, BCR, TPR)`);
  console.log(`   Requirements: 5 (SYNTH-1.1 → SYNTH-1.5)`);
  console.log(`   Mappings:     5 (1:1 official_scf)`);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
