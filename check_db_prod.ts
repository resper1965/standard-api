import postgres from "postgres";
import "dotenv/config";

async function check() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'scf_versions';`;
    console.log(res.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
check();
