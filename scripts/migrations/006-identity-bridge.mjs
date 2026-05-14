// Migration 006: Identity Bridge - link Better Auth user table to domain users table
const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_T8MHv6EoDIGh@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message);
  return d;
}

const stmts = [
  // Add ba_user_id column to domain users table
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS ba_user_id text",
  "CREATE UNIQUE INDEX IF NOT EXISTS users_ba_user_id_uidx ON users(ba_user_id)",
  
  // Backfill: link by email match
  `UPDATE users u SET ba_user_id = ba.id
   FROM "user" ba WHERE ba.email = u.email AND u.ba_user_id IS NULL`,
];

async function main() {
  console.log('[006] Creating Identity Bridge...');
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('  [ok]', stmt.replace(/\s+/g, ' ').substring(0, 90));
      ok++;
    } catch (e) {
      console.error('  [FAIL]', e.message);
      fail++;
    }
  }
  console.log('\n[006] Done:', ok, 'ok,', fail, 'failed');

  // Verify
  console.log('\n=== Identity Bridge Verification ===');
  const { rows } = await sql(`
    SELECT u.id as domain_id, u.email, u.display_name, u.ba_user_id, ba.name as ba_name
    FROM users u 
    LEFT JOIN "user" ba ON u.ba_user_id = ba.id
    ORDER BY u.email
  `);
  for (const r of rows) {
    const vals = Array.isArray(r) ? r : Object.values(r);
    console.log('  ', vals.join(' | '));
  }

  // Check for orphaned BA users (in BA but not in domain)
  const { rows: orphans } = await sql(`
    SELECT ba.id, ba.email, ba.name 
    FROM "user" ba 
    LEFT JOIN users u ON u.ba_user_id = ba.id 
    WHERE u.id IS NULL
  `);
  if (orphans.length > 0) {
    console.log('\n⚠ Orphaned BA users (no domain match):');
    for (const r of orphans) {
      const vals = Array.isArray(r) ? r : Object.values(r);
      console.log('  ', vals.join(' | '));
    }
  } else {
    console.log('\n✓ All BA users have domain counterparts');
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
