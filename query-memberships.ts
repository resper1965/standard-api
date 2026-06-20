import { Pool, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  const dbUrl = process.env.DATABASE_URL.replace(/^\uFEFF/, "").trim();
  const pool = new Pool({ connectionString: dbUrl });

  try {
    const res = await pool.query(`
      SELECT id, organization_id, user_id, email, display_name, role, status
      FROM memberships
      WHERE email = 'resper@bekaa.eu'
    `);
    console.log("MEMBERSHIPS TABLE:");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
