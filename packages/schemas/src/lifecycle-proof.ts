/**
 * Standard Lifecycle Proof â€” E2E Validation Script
 *
 * Simulates the "happy path" of document upload â†’ state transition â†’ audit:
 *   1. Verifies the seeded assessment exists in "draft" state
 *   2. Inserts a synthetic document record (simulating upload to R2)
 *   3. Transitions assessment state: draft â†’ documents_uploaded
 *   4. Records the state transition in assessment_events
 *   5. Records an audit log entry for the transition
 *   6. Queries back all records to confirm persistence
 *
 * Usage: pnpm db:lifecycle-proof
 *
 * AGENTS.md compliance:
 *   Â§7: All data carries organization_id, organization_id, assessment_id
 *   Â§11: State transitions follow the lifecycle enum
 *   Â§13: Audit logs for state changes
 *   Â§14: Synthetic data only
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import * as schema from "./db/schema";
import { sslForDatabaseUrl } from "./db-ssl.js";

const IDS = {
  tenant: "10000000-0000-4000-8000-000000000001",
  organization: "20000000-0000-4000-8000-000000000001",
  assessment: "30000000-0000-4000-8000-000000000001",
  user: "60000000-0000-4000-8000-000000000001",
} as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("âŒ DATABASE_URL is required.");
    process.exit(1);
  }

  const traceId = `lifecycle-proof-${Date.now()}`;
  const documentId = crypto.randomUUID();

  console.log("ðŸ”¬ Standard Lifecycle Proof â€” Starting...");
  console.log(`   trace_id: ${traceId}\n`);

  const client = postgres(databaseUrl, { ssl: sslForDatabaseUrl(databaseUrl) });
  const db = drizzle(client, { schema });

  // â”€â”€ Step 1: Verify seeded assessment exists in "draft" â”€â”€
  console.log("  [1/6] Verifying seeded assessment...");
  const [assessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.id, IDS.assessment));

  if (!assessment) {
    console.error("  âŒ Assessment not found. Run 'pnpm db:seed' first.");
    await client.end();
    process.exit(1);
  }
  if (assessment.state !== "draft") {
    console.log(`  âš ï¸  Assessment already in state "${assessment.state}" â€” resetting to "draft".`);
    await db
      .update(schema.assessments)
      .set({ state: "draft" })
      .where(eq(schema.assessments.id, IDS.assessment));
  }
  console.log(`  âœ… Assessment "${assessment.name}" found in state "draft".`);

  // â”€â”€ Step 2: Insert synthetic document â”€â”€
  console.log("  [2/6] Inserting synthetic document...");
  const storageKey = `${IDS.tenant}/${IDS.organization}/${IDS.assessment}/${documentId}/synthetic-policy.pdf`;
  await db.insert(schema.documents).values({
    id: documentId,
    organizationId: IDS.tenant,
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
  console.log(`  âœ… Document ${documentId} inserted.`);

  // â”€â”€ Step 3: Transition assessment state â”€â”€
  console.log("  [3/6] Transitioning assessment: draft â†’ documents_uploaded...");
  await db
    .update(schema.assessments)
    .set({ state: "documents_uploaded", updatedAt: new Date() })
    .where(eq(schema.assessments.id, IDS.assessment));
  console.log("  âœ… Assessment state updated.");

  // â”€â”€ Step 4: Record assessment event â”€â”€
  console.log("  [4/6] Recording assessment event...");
  await db.insert(schema.assessmentEvents).values({
    organizationId: IDS.tenant,
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
  console.log("  âœ… Assessment event recorded.");

  // â”€â”€ Step 5: Record audit log â”€â”€
  console.log("  [5/6] Recording audit log...");
  await db.insert(schema.auditLogs).values({
    action: "assessment_state_transition",
    organizationId: IDS.tenant,
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
  console.log("  âœ… Audit log recorded.");

  // â”€â”€ Step 6: Verify all records â”€â”€
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

  console.log("\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—");
  console.log("â•‘         LIFECYCLE PROOF â€” RESULTS                â•‘");
  console.log("â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£");
  console.log(`â•‘  Assessment State:    ${updatedAssessment?.state ?? "NOT FOUND"}`.padEnd(51) + "â•‘");
  console.log(`â•‘  Document Persisted:  ${doc ? "YES" : "NO"} (${doc?.filename ?? "?"})`.padEnd(51) + "â•‘");
  console.log(`â•‘  Events Recorded:     ${events.length}`.padEnd(51) + "â•‘");
  console.log(`â•‘  Audit Logs:          ${audits.length}`.padEnd(51) + "â•‘");
  console.log(`â•‘  Trace ID:            ${traceId}`.padEnd(51) + "â•‘");
  console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");

  const ok =
    updatedAssessment?.state === "documents_uploaded" &&
    doc !== undefined &&
    events.length >= 1 &&
    audits.length >= 1;

  if (ok) {
    console.log("\nðŸŽ‰ LIFECYCLE PROOF PASSED â€” All assertions confirmed.");
  } else {
    console.error("\nâŒ LIFECYCLE PROOF FAILED â€” Check results above.");
  }

  // â”€â”€ Cleanup: reset assessment back to draft for re-runs â”€â”€
  await db
    .update(schema.assessments)
    .set({ state: "draft" })
    .where(eq(schema.assessments.id, IDS.assessment));
  console.log("\nðŸ§¹ Assessment reset to 'draft' for future runs.\n");

  await client.end();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("âŒ Lifecycle proof failed:", err);
  process.exit(1);
});


