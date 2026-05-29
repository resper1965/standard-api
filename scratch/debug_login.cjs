const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get user
  const userRes = await client.query(`SELECT * FROM "user" WHERE email = $1`, ['resper@bekaa.eu']);
  if (userRes.rows.length === 0) { console.log('❌ User not found'); await client.end(); return; }

  const user = userRes.rows[0];
  console.log('\n=== USER ===');
  console.log({ id: user.id, email: user.email, name: user.name });

  // Get accounts using snake_case
  const accountRes = await client.query(`SELECT * FROM "account" WHERE user_id = $1`, [user.id]);
  console.log('\n=== ACCOUNTS ===');
  accountRes.rows.forEach(a => {
    console.log({
      provider_id: a.provider_id,
      account_id: a.account_id,
      hasPassword: !!a.password,
      passwordStart: a.password ? a.password.substring(0, 30) + '...' : 'NONE'
    });
  });

  if (accountRes.rows.length === 0) {
    console.log('\n❌ NO ACCOUNTS FOUND — user has no auth provider!');
    console.log('💡 DIAGNOSIS: User exists but has no credential or OAuth account linked.');
  }

  await client.end();
}

main().catch(console.error);
