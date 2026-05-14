// Migration 006b: Provision orphaned BA users into domain users table
const H = 'ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_REDACTED@' + H + '/neondb?sslmode=require';

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

async function main() {
  console.log('[006b] Provisioning orphaned BA users...');
  
  // Insert BA users that don't have a domain user yet
  const result = await sql(`
    INSERT INTO users (email, display_name, identity_provider, identity_provider_subject, ba_user_id)
    SELECT ba.email, COALESCE(ba.name, split_part(ba.email, '@', 1)), 'better-auth', ba.id, ba.id
    FROM "user" ba
    LEFT JOIN users u ON u.ba_user_id = ba.id OR u.email = ba.email
    WHERE u.id IS NULL
    RETURNING id, email, display_name, ba_user_id
  `);
  
  if (result.rows && result.rows.length > 0) {
    console.log('  Created', result.rows.length, 'domain user(s):');
    for (const r of result.rows) {
      const vals = Array.isArray(r) ? r : Object.values(r);
      console.log('    ', vals.join(' | '));
    }
  } else {
    console.log('  No orphaned users to provision.');
  }

  // Now update any remaining unlinked users by email
  await sql(`
    UPDATE users u SET ba_user_id = ba.id
    FROM "user" ba WHERE ba.email = u.email AND u.ba_user_id IS NULL
  `);

  // Verify final state
  console.log('\n=== Final Identity State ===');
  const { rows } = await sql(`
    SELECT u.id, u.email, u.display_name, u.ba_user_id,
           CASE WHEN ba.id IS NOT NULL THEN 'linked' ELSE 'orphan' END as status
    FROM users u 
    LEFT JOIN "user" ba ON u.ba_user_id = ba.id
    ORDER BY u.email
  `);
  for (const r of rows) {
    const vals = Array.isArray(r) ? r : Object.values(r);
    console.log('  ', vals.join(' | '));
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
