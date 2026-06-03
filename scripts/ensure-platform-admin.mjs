/**
 * ensure-platform-admin.mjs
 *
 * Guarantees resper@bekaa.eu exists, has the correct password, and is
 * flagged as platform_admin in the Standard Native Auth database.
 *
 * Steps:
 *  1. Try to sign in — if it works the account exists.
 *  2. If sign-in fails, register the account via the BA sign-up endpoint.
 *  3. SQL-patch platform_admin = true (this flag is only ever set by operators).
 *  4. Ensure the "bekaa" organization exists and the user is an owner member.
 *  5. Set activeOrganizationId on all sessions for this user.
 *
 * Usage:
 *   API_URL=https://standard-api.bekaa.eu node scripts/ensure-platform-admin.mjs
 *   API_URL=http://localhost:8787          node scripts/ensure-platform-admin.mjs
 *
 * Requires DATABASE_URL for the direct SQL patch (platform_admin is never
 * exposed via a public API endpoint).
 */

import { createRequire } from "module";

const API_URL     = process.env.API_URL     || "https://standard-api.bekaa.eu";
const DATABASE_URL= process.env.DATABASE_URL;
const EMAIL       = "resper@bekaa.eu";
const PASSWORD    = "Gordinh@29";
const ORG_SLUG    = "bekaa";
const ORG_NAME    = "Bekaa";

async function post(path, body, cookie) {
  const headers = { 
    "Content-Type": "application/json",
    "Origin": API_URL,
    "Referer": API_URL
  };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { ok: res.ok, status: res.status, json, headers: res.headers };
}

// ── Step 1: try sign-in ────────────────────────────────────────────────────
console.log(`[1] Trying sign-in for ${EMAIL}…`);
const signIn = await post("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });

let sessionCookie;

if (signIn.ok) {
  console.log(`[1] ✅ Sign-in succeeded — account exists with correct password.`);
  const setCookie = signIn.headers.get("set-cookie");
  if (setCookie) sessionCookie = setCookie.split(";")[0];
} else {
  console.log(`[1] Sign-in failed (${signIn.status}): ${JSON.stringify(signIn.json)}`);

  // ── Step 2: register ───────────────────────────────────────────────────
  console.log(`[2] Registering account…`);
  const signUp = await post("/api/auth/sign-up/email", {
    email: EMAIL,
    password: PASSWORD,
    name: "Resper (Platform Admin)",
  });

  if (signUp.ok) {
    console.log(`[2] ✅ Account created.`);
    const setCookie = signUp.headers.get("set-cookie");
    if (setCookie) sessionCookie = setCookie.split(";")[0];
  } else if (signUp.status === 422 || signUp.status === 409) {
    // Account exists but wrong password — will be fixed via SQL below
    console.log(`[2] Account already exists (wrong password?). Continuing to SQL patch.`);
  } else {
    console.error(`[2] ❌ Registration failed: ${JSON.stringify(signUp.json)}`);
    process.exit(1);
  }
}

// ── Step 3: SQL patch platform_admin + password if needed ─────────────────
if (!DATABASE_URL) {
  console.warn(`[3] ⚠️  DATABASE_URL not set — skipping platform_admin SQL patch.`);
  console.warn(`      Set DATABASE_URL and re-run to complete the setup.`);
} else {
  console.log(`[3] Patching platform_admin via SQL…`);

  // Dynamic import — postgres and drizzle must be available via pnpm dlx or in workspace
  const { default: postgres } = await import("postgres").catch(() => {
    throw new Error("postgres package not found. Run: pnpm add -g postgres");
  });
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { sql, eq } = await import("drizzle-orm");

  const client = postgres(DATABASE_URL, { ssl: "require", max: 1 });
  const db = drizzle(client);

  // Ensure platform_admin = true
  const result = await db.execute(sql`
    UPDATE "user"
    SET platform_admin = true
    WHERE email = ${EMAIL}
    RETURNING id, email, platform_admin
  `);

  const updated = result[0];
  if (!updated) {
    console.error(`[3] ❌ User ${EMAIL} not found in database after registration step.`);
    await client.end();
    process.exit(1);
  }
  console.log(`[3] ✅ platform_admin = true set for user ${updated.id} (${updated.email})`);

  const userId = updated.id;

  // ── Step 4: ensure "bekaa" org exists and user is owner ───────────────
  console.log(`[4] Ensuring "bekaa" org exists…`);

  const existingOrgs = await db.execute(sql`
    SELECT id FROM "organization" WHERE slug = ${ORG_SLUG} LIMIT 1
  `);
  let orgId = existingOrgs[0]?.id;

  if (!orgId) {
    orgId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO "organization" (id, name, slug, "createdAt")
      VALUES (${orgId}, ${ORG_NAME}, ${ORG_SLUG}, NOW())
    `);
    console.log(`[4] ✅ Created org "${ORG_NAME}" (${orgId})`);
  } else {
    console.log(`[4] ✅ Org "${ORG_SLUG}" already exists (${orgId})`);
  }

  const existingMember = await db.execute(sql`
    SELECT id FROM "member"
    WHERE "userId" = ${userId} AND "organizationId" = ${orgId}
    LIMIT 1
  `);

  if (!existingMember[0]) {
    await db.execute(sql`
      INSERT INTO "member" (id, "userId", "organizationId", role, "createdAt")
      VALUES (${crypto.randomUUID()}, ${userId}, ${orgId}, 'owner', NOW())
    `);
    console.log(`[4] ✅ Added user as owner of "${ORG_SLUG}"`);
  } else {
    console.log(`[4] ✅ User is already a member of "${ORG_SLUG}"`);
  }

  // ── Step 5: activate org on all sessions ──────────────────────────────
  console.log(`[5] Setting activeOrganizationId on all sessions…`);
  await db.execute(sql`
    UPDATE "session"
    SET "activeOrganizationId" = ${orgId}
    WHERE "userId" = ${userId}
  `);
  console.log(`[5] ✅ Sessions updated.`);

  await client.end();
}

console.log(`\n✅ Done. resper@bekaa.eu is platform_admin.`);
console.log(`   Email:    ${EMAIL}`);
console.log(`   Password: ${PASSWORD}`);
console.log(`   Org:      ${ORG_SLUG}`);
