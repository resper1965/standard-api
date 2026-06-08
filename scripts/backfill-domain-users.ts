/**
 * @module backfill-domain-users
 * @description One-time migration: creates domain `users` rows for all
 * existing `ba_user` records that don't have a corresponding domain user.
 *
 * This script is needed because the new event-driven provisioning (via
 * USER_LIFECYCLE_QUEUE) only fires for NEW signups. Existing BA users
 * created before the refactor need to be backfilled.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-domain-users.ts
 *
 * Idempotent: uses ON CONFLICT (email) DO UPDATE to link existing users.
 * Safe to run multiple times.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { baUser } from "@standard/schemas";
import { users } from "@standard/schemas";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const client = neon(dbUrl);
  const db = drizzle({ client });

  console.log("[backfill] Starting domain user backfill...");

  // Find all BA users that DON'T have a linked domain user
  const orphanedBaUsers = await db
    .select({
      id: baUser.id,
      email: baUser.email,
      name: baUser.name,
    })
    .from(baUser)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.identity_provider_subject = ${baUser.id}
      )`
    );

  console.log(`[backfill] Found ${orphanedBaUsers.length} BA users without domain user.`);

  if (orphanedBaUsers.length === 0) {
    console.log("[backfill] Nothing to do. All BA users are linked.");
    return;
  }

  let created = 0;
  let linked = 0;
  let errors = 0;

  for (const baUserRow of orphanedBaUsers) {
    try {
      // Check if a domain user with this email already exists (but not linked)
      const [existing] = await db
        .select({ id: users.id, identityProviderSubject: users.identityProviderSubject })
        .from(users)
        .where(eq(users.email, baUserRow.email))
        .limit(1);

      if (existing) {
        // Link existing domain user to BA user
        if (!existing.identityProviderSubject) {
          await db
            .update(users)
            .set({ identityProviderSubject: baUserRow.id })
            .where(eq(users.id, existing.id));
          linked++;
          console.log(`  ✓ Linked: ${baUserRow.email} → domain user ${existing.id}`);
        } else {
          console.log(`  ⊘ Skipped: ${baUserRow.email} → already linked to ${existing.identityProviderSubject}`);
        }
      } else {
        // Create new domain user
        const [inserted] = await db
          .insert(users)
          .values({
            email: baUserRow.email,
            displayName: baUserRow.name || "User",
            identityProvider: "standard-native-auth",
            identityProviderSubject: baUserRow.id,
          })
          .returning({ id: users.id });

        created++;
        console.log(`  ✓ Created: ${baUserRow.email} → domain user ${inserted?.id}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ Error for ${baUserRow.email}:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`\n[backfill] Complete.`);
  console.log(`  Created: ${created}`);
  console.log(`  Linked:  ${linked}`);
  console.log(`  Errors:  ${errors}`);
  console.log(`  Total:   ${orphanedBaUsers.length}`);
}

main().catch((err) => {
  console.error("[backfill] Fatal error:", err);
  process.exit(1);
});
