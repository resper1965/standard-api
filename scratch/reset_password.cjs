const { Client } = require('pg');
const crypto = require('crypto');

// better-auth uses scrypt for password hashing
// Let's use the same approach as better-auth
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, hash) => {
      if (err) reject(err);
      // better-auth format: hash:salt
      resolve(`${hash.toString('hex')}:${salt}`);
    });
  });
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const newPassword = 'Gordinh@29';
  const hashedPassword = await hashPassword(newPassword);
  
  console.log('New hash snippet:', hashedPassword.substring(0, 40) + '...');

  // Update password for the credential account
  const result = await client.query(
    `UPDATE "account" SET password = $1, updated_at = NOW() WHERE user_id = $2 AND provider_id = 'credential' RETURNING id, provider_id`,
    [hashedPassword, '38YmJtQEQiZkRKBLue2WffNCCVyOlg2r']
  );

  if (result.rows.length > 0) {
    console.log('✅ Password updated successfully:', result.rows[0]);
  } else {
    console.log('❌ No account updated. Checking...');
    const acc = await client.query(`SELECT * FROM "account" WHERE user_id = $1`, ['38YmJtQEQiZkRKBLue2WffNCCVyOlg2r']);
    console.log('Accounts:', acc.rows.map(r => ({ provider_id: r.provider_id, account_id: r.account_id })));
  }

  await client.end();
}

main().catch(console.error);
