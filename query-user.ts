import { Pool, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  const dbUrl = process.env.AUTH_DATABASE_URL.replace(/^\uFEFF/, "").trim();
  const pool = new Pool({ connectionString: dbUrl });

  try {
    console.log("Adding role column...");
    await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';`);
    console.log("Column added.");

    console.log("Updating role for resper@bekaa.eu to admin...");
    const res = await pool.query(`
      UPDATE "user"
      SET role = 'admin'
      WHERE email = 'resper@bekaa.eu'
      RETURNING *
    `);
    console.log("Updated user:");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
