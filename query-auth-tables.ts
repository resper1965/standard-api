import { Pool, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  const dbUrl = process.env.AUTH_DATABASE_URL.replace(/^\uFEFF/, "").trim();
  const pool = new Pool({ connectionString: dbUrl });

  try {
    const res = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
