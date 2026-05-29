/**
 * Reset password using better-auth's own hash function.
 * Run from monorepo root with:
 *   $env:DATABASE_URL="..."; npx tsx scratch/reset_password.mts
 */
import { betterAuth } from "better-auth";

// Use better-auth internal hash utility
// better-auth uses scrypt via its own crypto module
const password = "Gordinh@29";

async function main() {
  // Import the internal password hasher
  const { hashPassword } = await import("better-auth/crypto");

  const hash = await hashPassword(password);
  console.log("Generated hash:", hash.substring(0, 50) + "...");

  // Now update in DB
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    `UPDATE "account" SET password = $1, updated_at = NOW() WHERE user_id = $2 AND provider_id = 'credential' RETURNING id`,
    [hash, "38YmJtQEQiZkRKBLue2WffNCCVyOlg2r"]
  );

  if (result.rows.length > 0) {
    console.log("✅ Password reset successfully!");
    console.log("🔑 You can now login with: resper@bekaa.eu / Gordinh@29");
  } else {
    console.log("❌ No rows updated");
  }

  await client.end();
}

main().catch(console.error);
