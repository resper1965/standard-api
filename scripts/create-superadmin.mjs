/**
 * Creates the superadmin user directly in Neon DB.
 * Better Auth uses scrypt for password hashing (via built-in Node crypto).
 * 
 * Usage: node scripts/create-superadmin.mjs
 */
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

const DATABASE_URL =
  "postgresql://neondb_owner:npg_T8MHv6EoDIGh@ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

const EMAIL = "resper@bekaa.eu";
const PASSWORD = "Gordinh@29";
const NAME = "Resper Admin";
const ROLE = "admin";

/**
 * Hash password using the same format Better Auth uses internally:
 *   salt:hash  (both hex-encoded, scrypt with N=16384, r=16, p=1, keyLen=64)
 */
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function main() {
  const sql = neon(DATABASE_URL);
  console.log("✅ Connected to Neon DB");

  // Check if user already exists
  const existing = await sql`SELECT id FROM "user" WHERE email = ${EMAIL}`;

  if (existing.length > 0) {
    console.log(`⚠️  User ${EMAIL} already exists with id: ${existing[0].id}`);
    // Update role to admin
    await sql`UPDATE "user" SET role = ${ROLE} WHERE email = ${EMAIL}`;
    console.log(`✅ Role updated to "${ROLE}"`);
    return;
  }

  // Generate user ID (nanoid-like random string, 21 chars)
  const userId = randomBytes(16).toString("hex").slice(0, 21);
  const accountId = randomBytes(16).toString("hex").slice(0, 21);
  const hashedPassword = await hashPassword(PASSWORD);
  const now = new Date();

  // Insert user
  await sql`INSERT INTO "user" (id, name, email, email_verified, role, banned, created_at, updated_at)
     VALUES (${userId}, ${NAME}, ${EMAIL}, ${true}, ${ROLE}, ${false}, ${now}, ${now})`;
  console.log(`✅ User created: ${EMAIL} (id: ${userId})`);

  // Insert credential account
  await sql`INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES (${accountId}, ${userId}, ${"credential"}, ${userId}, ${hashedPassword}, ${now}, ${now})`;
  console.log(`✅ Credential account created with hashed password`);
  console.log(`\n🎉 Superadmin ready! Login with: ${EMAIL}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
