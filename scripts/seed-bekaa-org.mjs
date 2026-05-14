const NEON_HOST = "ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech";
const NEON_USER = "neondb_owner";
const NEON_PASS = "npg_REDACTED";
const NEON_DB = "neondb";
const CONN_STR = `postgresql://${NEON_USER}:${NEON_PASS}@${NEON_HOST}/${NEON_DB}?sslmode=require`;

async function query(sqlText, params = []) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": CONN_STR },
    body: JSON.stringify({ query: sqlText, params }),
  });
  const data = await res.json();
  if (data.message) throw new Error(data.message);
  const fields = data.fields || [];
  const rawRows = data.rows || [];
  if (rawRows.length === 0) return [];
  if (Array.isArray(rawRows[0])) {
    return rawRows.map(row => {
      const obj = {};
      fields.forEach((f, i) => { obj[f.name] = row[i]; });
      return obj;
    });
  }
  return rawRows;
}

async function main() {
  console.log("[seed] Connecting...");

  // 1. Get user
  const users = await query("SELECT id, name, email FROM \"user\" WHERE email = $1 LIMIT 1", ["resper@bekaa.eu"]);
  if (!users.length) { console.error("User not found!"); process.exit(1); }
  const user = users[0];
  console.log("[seed] User:", user.name, user.id);

  // 2. Org already exists: org_pa5khl — update metadata
  const orgId = "org_pa5khl";
  const meta = JSON.stringify({ domain: "bekaa.eu", billing_email: "billing@bekaa.eu", country: "PT", plan: "enterprise" });
  await query("UPDATE organization SET metadata = $1::jsonb WHERE id = $2", [meta, orgId]);
  console.log("[seed] Updated org metadata.");

  // 3. Check/create membership
  const members = await query("SELECT id FROM member WHERE user_id = $1 AND organization_id = $2 LIMIT 1", [user.id, orgId]);
  if (members.length) {
    console.log("[seed] Already member:", members[0].id);
  } else {
    const mid = crypto.randomUUID();
    await query("INSERT INTO member (id, user_id, organization_id, role, created_at) VALUES ($1, $2, $3, $4, NOW())", [mid, user.id, orgId, "owner"]);
    console.log("[seed] Added as owner.");
  }

  // 4. Set active organization on all sessions
  const updated = await query("UPDATE session SET active_organization_id = $1 WHERE user_id = $2 RETURNING id", [orgId, user.id]);
  console.log("[seed] Sessions updated:", updated.length);

  // 5. Verify
  const check = await query("SELECT id, active_organization_id FROM session WHERE user_id = $1", [user.id]);
  console.log("[seed] Session check:", JSON.stringify(check));

  console.log("\n[seed] ✅ Done!");
  console.log("  Org: Bekaa (" + orgId + ")");
  console.log("  Admin: " + user.email);
  console.log("  Domain: bekaa.eu");
  console.log("  Refresh browser to activate.");
}

main().catch(e => { console.error("[seed] Error:", e.message); process.exit(1); });
