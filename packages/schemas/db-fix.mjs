import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

config({ path: path.resolve('../../.env') });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
  try {
    const file = fs.readFileSync('../../infra/docker/postgres/migrations/0003_right_thunderbolt_ross.sql', 'utf8');
    const hash = crypto.createHash('sha256').update(file).digest('hex');
    console.log('Hash for 0003 is:', hash);
    
    // Insert into drizzle.__drizzle_migrations
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${Date.now()})
      ON CONFLICT DO NOTHING
    `;
    console.log('Inserted 0003 hash into migrations table!');
    
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
