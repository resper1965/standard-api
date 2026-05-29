const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  const res = await client.query(`SELECT id, email, name FROM "user"`);
  console.log('Users:', res.rows);
  
  const emails = res.rows.map(r => r.email);
  console.log('User emails:', emails);
  
  await client.end();
}

main().catch(console.error);
