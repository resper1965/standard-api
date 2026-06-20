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
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organizations';
    `);
    console.log("ORGANIZATIONS TABLE:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query(`
      SELECT * FROM organizations LIMIT 5;
    `);
    console.log("ORGANIZATIONS DATA:");
    console.log(JSON.stringify(res2.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
