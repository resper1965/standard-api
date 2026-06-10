/**
 * @file evals/fixtures/auth-seed.ts
 * @description Synthetic seed data for the auth branch in local development.
 *
 * Populates:
 *   - 1 platform admin (baUser)
 *   - 1 regular approved user (baUser) with associated organization
 *   - 1 pending (not-approved) user
 *   - 1 API key for the approved user's org
 *
 * NEVER use real customer data. All data is synthetic.
 * Run via: pnpm db:seed:auth (auth branch DATABASE_URL)
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { baUsers, baSessions } from "../../packages/schemas/src/db/auth-schema";
import {
  organizations,
  apiKeys,
} from "../../packages/schemas/src/db/organization-schema";
import crypto from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const AUTH_DATABASE_URL =
  process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;
if (!AUTH_DATABASE_URL) {
  console.error("[seed:auth] AUTH_DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(AUTH_DATABASE_URL, { max: 1 });
const db = drizzle(client);

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date();
const FIXED_ORG_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000010";
const USER_ID = "00000000-0000-0000-0000-000000000011";
const PENDING_ID = "00000000-0000-0000-0000-000000000012";

/** Bcrypt-like placeholder hash — only for synthetic dev data. Not production-safe. */
const FAKE_HASH = "$2a$10$fake_dev_password_hash_synthetic_only";

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("[seed:auth] Starting auth branch seed...");

  // 1. Platform admin user
  await db
    .insert(baUsers)
    .values({
      id: ADMIN_USER_ID,
      email: "platform-admin@synthetic.test",
      name: "Platform Admin (Synthetic)",
      emailVerified: true,
      platformAdmin: true,
      approved: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 2. Regular approved user
  await db
    .insert(baUsers)
    .values({
      id: USER_ID,
      email: "user@synthetic.test",
      name: "Regular User (Synthetic)",
      emailVerified: true,
      platformAdmin: false,
      approved: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 3. Pending (not approved) user
  await db
    .insert(baUsers)
    .values({
      id: PENDING_ID,
      email: "pending@synthetic.test",
      name: "Pending User (Synthetic)",
      emailVerified: false,
      platformAdmin: false,
      approved: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 4. Organization for regular user (1:1 model)
  await db
    .insert(organizations)
    .values({
      id: FIXED_ORG_ID,
      userId: USER_ID,
      name: "Synthetic Test Org",
      slug: "synthetic-test-org",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 5. API key for the test org (pre-hashed synthetic key)
  const syntheticKeyHash = crypto
    .createHash("sha256")
    .update("standard_dev_test_key_synthetic_only")
    .digest("hex");

  await db
    .insert(apiKeys)
    .values({
      id: crypto.randomUUID(),
      organizationId: FIXED_ORG_ID,
      name: "Dev Test Key (Synthetic)",
      keyHash: syntheticKeyHash,
      maskedKey: "standard_dev_test_...etic_only",
      scopes: ["assessments:read", "assessments:write", "kb:read"],
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  console.log("[seed:auth] Seed complete.");
  console.log("  platform admin:", ADMIN_USER_ID);
  console.log("  approved user: ", USER_ID);
  console.log("  pending user:  ", PENDING_ID);
  console.log("  org:           ", FIXED_ORG_ID);

  await client.end();
}

seed().catch((err) => {
  console.error("[seed:auth] Error:", err);
  process.exit(1);
});
