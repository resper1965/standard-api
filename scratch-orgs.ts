import { Pool } from "pg";
import { config } from "dotenv";

config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  const authDbUrl = process.env.AUTH_DATABASE_URL!.replace(/^\uFEFF/, "").trim();
  const appDbUrl = process.env.DATABASE_URL!.replace(/^\uFEFF/, "").trim();

  const authPool = new Pool({ connectionString: authDbUrl });
  const appPool = new Pool({ connectionString: appDbUrl });

  try {
    // Get new user ID
    const users = await authPool.query(`SELECT id FROM "user" WHERE email = 'resper@bekaa.eu'`);
    if (users.rowCount === 0) {
      console.log("User not found in auth db");
      return;
    }
    const newUserId = users.rows[0].id;
    console.log("New User ID:", newUserId);

    // Get old user ID from organizations (if any)
    const orgs = await appPool.query(`SELECT id, user_id, name FROM organizations`);
    console.log("All orgs:", orgs.rows);

    // Find the one that probably belongs to resper@bekaa.eu
    // Let's just update all orgs where user_id != newUserId to be newUserId
    // Wait, if there are multiple users, we shouldn't update them all. 
    // Let's see how many orgs there are first.
  } catch (err) {
    console.error(err);
  } finally {
    await authPool.end();
    await appPool.end();
  }
}

run();
