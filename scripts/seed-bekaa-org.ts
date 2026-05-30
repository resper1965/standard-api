/**
 * Seed script: Create the "Bekaa" organization in production DB.
 * 
 * This creates the organization in the Standard Native Auth `organization` table
 * and adds the admin user (resper@bekaa.eu) as an owner member.
 * 
 * Usage: npx tsx scripts/seed-bekaa-org.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = neon(DATABASE_URL);
const db = drizzle(client as any);

async function main() {
  console.log("[seed] Connecting to production database...");

  // 1. Find the admin user (resper@bekaa.eu)
  const users = await db.execute(sql`SELECT id, name, email FROM "user" WHERE email = 'resper@bekaa.eu' LIMIT 1`);
  const user = (users as any).rows?.[0] ?? (users as any)[0];
  
  if (!user) {
    console.error("[seed] ERROR: User resper@bekaa.eu not found in database!");
    process.exit(1);
  }
  console.log(`[seed] Found user: ${user.name} (${user.id})`);

  // 2. Check if organization "bekaa" already exists
  const existingOrgs = await db.execute(sql`SELECT id, name, slug FROM "organization" WHERE slug = 'bekaa' LIMIT 1`);
  const existingOrg = (existingOrgs as any).rows?.[0] ?? (existingOrgs as any)[0];
  
  let orgId: string;

  if (existingOrg) {
    console.log(`[seed] Organization "bekaa" already exists (${existingOrg.id}). Skipping creation.`);
    orgId = existingOrg.id;
  } else {
    // 3. Create the organization
    orgId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO "organization" (id, name, slug, logo, metadata, "createdAt")
      VALUES (
        ${orgId},
        'Bekaa',
        'bekaa',
        NULL,
        ${{
          domain: "bekaa.eu",
          billing_email: "billing@bekaa.eu",
          tax_id: null,
          country: "PT",
          plan: "enterprise"
        }}::jsonb,
        NOW()
      )
    `);
    console.log(`[seed] Created organization "Bekaa" (${orgId})`);
  }

  // 4. Check if user is already a member
  const existingMember = await db.execute(sql`
    SELECT id FROM "member" WHERE "userId" = ${user.id} AND "organizationId" = ${orgId} LIMIT 1
  `);
  const member = (existingMember as any).rows?.[0] ?? (existingMember as any)[0];
  
  if (member) {
    console.log(`[seed] User already member of "bekaa" org. Skipping membership.`);
  } else {
    const memberId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO "member" (id, "userId", "organizationId", role, "createdAt")
      VALUES (${memberId}, ${user.id}, ${orgId}, 'owner', NOW())
    `);
    console.log(`[seed] Added user as owner of "bekaa" org.`);
  }

  // 5. Set the active organization on the user's sessions
  await db.execute(sql`
    UPDATE "session" 
    SET "activeOrganizationId" = ${orgId}
    WHERE "userId" = ${user.id}
  `);
  console.log(`[seed] Set active organization to "bekaa" on all sessions.`);

  // 6. Print summary
  console.log(`\n[seed] ✅ Done!`);
  console.log(`  Organization: Bekaa (${orgId})`);
  console.log(`  Domain: bekaa.eu`);
  console.log(`  Admin: ${user.email} → role: owner`);
  console.log(`  Sessions updated with activeOrganizationId`);
  console.log(`\n  User should now refresh the browser to see the active org.`);
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
