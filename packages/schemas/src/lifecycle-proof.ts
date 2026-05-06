/**
 * Standard Lifecycle Proof — E2E Validation Script
 *
 * Simulates the "happy path" of document upload → state transition → audit:
 *   1. Verifies the seeded assessment exists in "draft" state
 *   2. Inserts a synthetic document record (simulating upload to R2)
 *   3. Transitions assessment state: draft → documents_uploaded
 *   4. Records the state transition in assessment_events
 *   5. Records an audit log entry for the transition
 *   6. Queries back all records to confirm persistence
 *
 * Usage: pnpm db:lifecycle-proof
 *
 * AGENTS.md compliance:
 *   §7: All data carries tenant_id, organization_id, assessment_id
 *   §11: State transitions follow the lifecycle enum
 *   §13: Audit logs for state changes
 *   §14: Synthetic data only
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import * as schema from "./db/schema";
import { randomUUID } from "node:crypto";

const IDS = {
  tenant: "10000000-0000-4000-8000-000000000001",
  organization: "20000000-0000-4000-8000-000000000001",
  assessment: "30000000-0000-4000-8000-000000000001",
  user: "60000000-0000-4000-8000-000000000001",
} as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required.");
    process.exit(1);
  }

  const traceId = `lifecycle-proof-${Date.now()}`;
  const documentId = randomUUID();

  console.log("🔬 Standard Lifecycle Proof — Starting...");
  console.log(`   trace_id: ${traceId}\n`);

  const client = postgres(databaseUrl, { ssl: "require" });
  const db = drizzle(client, { schema });

  // ── Step 1: Verify seeded assessment exists in "draft" ──
  console.log("  [1/6] Verifying seeded assessment...");
  const [assessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.id, IDS.assessment));

  if (!assessment) {
    console.error("  ❌ Assessment not found. Run 'pnpm db:seed' first.");
    await client.end();
    process.exit(1);
  }
  if (assessment.state !== "draft") {
    console.log(`  ⚠️  Assessment already in state "${assessment.state}" — resetting to "draft".`);
    await db
      .update(schema.assessments)
      .set({ state: "draft" })
      .where(eq(schema.assessments.id, IDS.assessment));
  }
  console.log(`  ✅ Assessment "${assessment.name}" found in state "draft".`);

  // ── Step 2: Insert synthetic document ──
  console.log("  [2/6] Inserting synthetic document...");
  const storageKey = `${IDS.tenant}/${IDS.organization}/${IDS.assessment}/${documentId}/synthetic-policy.pdf`;
  await db.insert(schema.documents).values({
    id: documentId,
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    assessmentId: IDS.assessment,
    originalFilename: "synthetic-governance-policy.pdf",
    storageProvider: "r2",
    storageKey,
    contentHash: `sha256:synthetic-${Date.now()}`,
    mimeType: "application/pdf",
    fileSize: 42_000,
    uploadedBy: IDS.user,
    classification: "internal",
    documentType: "policy",
    language: "en",
  });
  console.log(`  ✅ Document ${documentId} inserted.`);

  // ── Step 3: Transition assessment state ──
  console.log("  [3/6] Transitioning assessment: draft → documents_uploaded...");
  await db
    .update(schema.assessments)
    .set({ state: "documents_uploaded", updatedAt: new Date() })
    .where(eq(schema.assessments.id, IDS.assessment));
  console.log("  ✅ Assessment state updated.");

  // ── Step 4: Record assessment event ──
  console.log("  [4/6] Recording assessment event...");
  await db.insert(schema.assessmentEvents).values({
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    assessmentId: IDS.assessment,
    previousState: "draft",
    nextState: "documents_uploaded",
    eventType: "lifecycle_transition",
    actorId: IDS.user,
    traceId,
    metadata: {
      trigger: "lifecycle-proof-script",
      document_id: documentId,
    },
  });
  console.log("  ✅ Assessment event recorded.");

  // ── Step 5: Record audit log ──
  console.log("  [5/6] Recording audit log...");
  await db.insert(schema.auditLogs).values({
    action: "assessment_state_transition",
    tenantId: IDS.tenant,
    organizationId: IDS.organization,
    actorId: IDS.user,
    resourceType: "assessment",
    resourceId: IDS.assessment,
    traceId,
    metadata: {
      from_state: "draft",
      to_state: "documents_uploaded",
      document_id: documentId,
      script: "packages/schemas/src/lifecycle-proof.ts",
    },
  });
  console.log("  ✅ Audit log recorded.");

  // ── Step 6: Verify all records ──
  console.log("  [6/6] Verifying persistence...");

  const [updatedAssessment] = await db
    .select({ state: schema.assessments.state, name: schema.assessments.name })
    .from(schema.assessments)
    .where(eq(schema.assessments.id, IDS.assessment));

  const [doc] = await db
    .select({ id: schema.documents.id, filename: schema.documents.originalFilename })
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId));

  const events = await db
    .select({ eventType: schema.assessmentEvents.eventType, nextState: schema.assessmentEvents.nextState })
    .from(schema.assessmentEvents)
    .where(eq(schema.assessmentEvents.traceId, traceId));

  const audits = await db
    .select({ action: schema.auditLogs.action, traceId: schema.auditLogs.traceId })
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.traceId, traceId));

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         LIFECYCLE PROOF — RESULTS                ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Assessment State:    ${updatedAssessment?.state ?? "NOT FOUND"}`.padEnd(51) + "║");
  console.log(`║  Document Persisted:  ${doc ? "YES" : "NO"} (${doc?.filename ?? "?"})`.padEnd(51) + "║");
  console.log(`║  Events Recorded:     ${events.length}`.padEnd(51) + "║");
  console.log(`║  Audit Logs:          ${audits.length}`.padEnd(51) + "║");
  console.log(`║  Trace ID:            ${traceId}`.padEnd(51) + "║");
  console.log("╚══════════════════════════════════════════════════╝");

  const ok =
    updatedAssessment?.state === "documents_uploaded" &&
    doc !== undefined &&
    events.length >= 1 &&
    audits.length >= 1;

  if (ok) {
    console.log("\n🎉 LIFECYCLE PROOF PASSED — All assertions confirmed.");
  } else {
    console.error("\n❌ LIFECYCLE PROOF FAILED — Check results above.");
  }

  // ── Cleanup: reset assessment back to draft for re-runs ──
  await db
    .update(schema.assessments)
    .set({ state: "draft" })
    .where(eq(schema.assessments.id, IDS.assessment));
  console.log("\n🧹 Assessment reset to 'draft' for future runs.\n");

  await client.end();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Lifecycle proof failed:", err);
  process.exit(1);
});

