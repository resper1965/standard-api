import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.AUTH_DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to Auth DB");

    // Add role column
    await client.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';`);
    console.log("Added role column");

    // Set resper to admin
    const res = await client.query(`UPDATE "user" SET role = 'admin' WHERE email = 'resper@bekaa.eu' RETURNING *;`);
    console.log("Updated user:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
