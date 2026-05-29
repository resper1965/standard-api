const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Due to foreign keys (memberships, sessions, etc), we might need to delete them first or cascade.
    // Assuming organization has no foreign key constraint blocking it (or cascade is set),
    // wait, member table has organizationId. Let's delete members of those orgs first.
    
    // get orgs to delete
    const res = await client.query(`SELECT id FROM organization WHERE name != 'Bekaa'`);
    const ids = res.rows.map(r => r.id);
    
    if (ids.length > 0) {
      const idList = ids.map(id => `'${id}'`).join(',');
      await client.query(`DELETE FROM member WHERE "organizationId" IN (${idList})`);
      await client.query(`DELETE FROM invitation WHERE "organizationId" IN (${idList})`);
      await client.query(`DELETE FROM organization WHERE id IN (${idList})`);
      console.log(`Deleted ${ids.length} organizations and their members/invitations.`);
    } else {
      console.log('No organizations to delete.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
